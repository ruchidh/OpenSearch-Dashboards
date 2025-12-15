/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Readable } from 'stream';
import { Logger } from '@opensearch-project/opensearch';
import {
  IFileProcessor,
  IngestOptions,
  IngestResponse,
  ParseOptions,
  ValidationOptions
} from '../types';

export interface EnhancedIngestOptions extends IngestOptions {
  chunkSize?: number;
  maxRecords?: number;
  progressCallback?: (progress: { processed: number; total: number; percentage: number }) => void;
  skipFirstRow?: boolean;
  transformFunction?: (record: Record<string, any>) => Record<string, any>;
}

export interface EnhancedIngestResponse extends IngestResponse {
  processingTime: number;
  chunksProcessed: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  performanceMetrics: {
    recordsPerSecond: number;
    averageChunkTime: number;
  };
}

export class EnhancedFileProcessorService {
  private processors: Map<string, IFileProcessor> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  registerFileProcessor(fileType: string, processor: IFileProcessor): void {
    this.processors.set(fileType, processor);
    this.logger.info(`Enhanced file processor registered for type: ${fileType}`);
  }

  getFileProcessor(fileType: string): IFileProcessor | undefined {
    return this.processors.get(fileType);
  }

  /**
   * Enhanced file ingestion with support for large datasets (60k+ records)
   * Features:
   * - Chunked processing to prevent memory issues
   * - Progress tracking
   * - Performance monitoring
   * - Memory optimization
   * - Error recovery
   */
  async ingestFileEnhanced(
    fileType: string,
    file: Readable,
    options: EnhancedIngestOptions
  ): Promise<EnhancedIngestResponse> {
    const startTime = Date.now();
    const processor = this.getFileProcessor(fileType);

    if (!processor) {
      throw new Error(`No enhanced processor found for file type: ${fileType}`);
    }

    const chunkSize = options.chunkSize || 1000;
    const maxRecords = options.maxRecords || 100000;

    this.logger.info(`Starting enhanced import for ${fileType} with chunk size: ${chunkSize}, max records: ${maxRecords}`);

    try {
      // First, parse the entire file to get total record count
      const allRecords = await processor.parseFile(file, maxRecords, {
        delimiter: options.delimiter,
        skipFirstRow: options.skipFirstRow || false,
      });

      if (allRecords.length > maxRecords) {
        throw new Error(`File contains ${allRecords.length} records, which exceeds the maximum of ${maxRecords}`);
      }

      this.logger.info(`Parsed ${allRecords.length} records for enhanced processing`);

      // Process in chunks
      let processedRecords = 0;
      let totalFailures = 0;
      let chunksProcessed = 0;
      const chunkTimes: number[] = [];
      const failedRows: number[] = [];

      for (let i = 0; i < allRecords.length; i += chunkSize) {
        const chunkStartTime = Date.now();
        const chunk = allRecords.slice(i, i + chunkSize);

        // Apply transform function if provided
        const transformedChunk = options.transformFunction
          ? chunk.map(options.transformFunction)
          : chunk;

        try {
          // Create a readable stream from chunk data
          const chunkStream = new Readable({
            objectMode: true,
            read() {
              transformedChunk.forEach(record => this.push(record));
              this.push(null);
            }
          });

          const chunkResult = await processor.ingestFile(chunkStream, {
            ...options,
            // Modify index name for chunked processing if needed
            indexName: options.indexName,
          });

          processedRecords += chunkResult.total;
          totalFailures += chunkResult.failedRows?.length || 0;

          // Track failed row indices (adjust for chunk offset)
          if (chunkResult.failedRows) {
            chunkResult.failedRows.forEach(failedIndex => {
              failedRows.push(i + failedIndex);
            });
          }

          chunksProcessed++;
          const chunkTime = Date.now() - chunkStartTime;
          chunkTimes.push(chunkTime);

          // Report progress
          const progress = {
            processed: processedRecords,
            total: allRecords.length,
            percentage: Math.round((processedRecords / allRecords.length) * 100)
          };

          if (options.progressCallback) {
            options.progressCallback(progress);
          }

          this.logger.debug(`Processed chunk ${chunksProcessed}: ${chunk.length} records in ${chunkTime}ms`);

          // Memory cleanup between chunks
          if (chunksProcessed % 10 === 0) {
            if (global.gc) {
              global.gc();
            }
          }

        } catch (chunkError) {
          this.logger.error(`Error processing chunk ${chunksProcessed + 1}:`, chunkError);

          // Mark all records in this chunk as failed
          for (let j = 0; j < chunk.length; j++) {
            failedRows.push(i + j);
          }
          totalFailures += chunk.length;
        }
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const memoryUsage = process.memoryUsage();

      const response: EnhancedIngestResponse = {
        total: processedRecords,
        message: `Enhanced import completed: ${processedRecords} records processed in ${chunksProcessed} chunks`,
        failedRows,
        success: totalFailures === 0,
        processingTime,
        chunksProcessed,
        memoryUsage: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
        },
        performanceMetrics: {
          recordsPerSecond: Math.round(processedRecords / (processingTime / 1000)),
          averageChunkTime: chunkTimes.length > 0 ? Math.round(chunkTimes.reduce((a, b) => a + b, 0) / chunkTimes.length) : 0,
        },
      };

      this.logger.info(`Enhanced import completed: ${processedRecords} records, ${totalFailures} failures, ${processingTime}ms total`);
      return response;

    } catch (error) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      this.logger.error(`Enhanced import failed after ${processingTime}ms:`, error);

      throw new Error(`Enhanced import failed: ${error.message}`);
    }
  }

  /**
   * Enhanced file parsing with memory optimization for large files
   */
  async parseFileEnhanced(
    fileType: string,
    file: Readable,
    options: {
      previewLimit?: number;
      samplingRate?: number;
      skipFirstRow?: boolean;
      delimiter?: string;
    } = {}
  ): Promise<{
    preview: Array<Record<string, any>>;
    totalRecords: number;
    estimatedFileSize: number;
    fieldStats: Record<string, {
      type: string;
      uniqueValues: number;
      nullCount: number;
      sampleValues: string[];
    }>;
  }> {
    const processor = this.getFileProcessor(fileType);

    if (!processor) {
      throw new Error(`No processor found for file type: ${fileType}`);
    }

    const previewLimit = options.previewLimit || 1000;
    const samplingRate = options.samplingRate || 0.1; // Sample 10% of records for analysis

    try {
      // Parse with larger limit to get better statistics
      const allRecords = await processor.parseFile(file, Math.max(previewLimit * 10, 10000), {
        delimiter: options.delimiter,
        skipFirstRow: options.skipFirstRow || false,
      });

      // Calculate field statistics
      const fieldStats: Record<string, {
        type: string;
        uniqueValues: number;
        nullCount: number;
        sampleValues: string[];
      }> = {};

      if (allRecords.length > 0) {
        const sampleSize = Math.min(1000, Math.ceil(allRecords.length * samplingRate));
        const sampleRecords = this.getRandomSample(allRecords, sampleSize);

        // Analyze fields
        const fieldNames = Object.keys(allRecords[0]);

        fieldNames.forEach(fieldName => {
          const values = sampleRecords.map(record => record[fieldName]).filter(v => v != null);
          const uniqueValues = new Set(values);
          const nullCount = sampleRecords.length - values.length;

          // Determine field type based on sample values
          const type = this.inferFieldType(values);

          fieldStats[fieldName] = {
            type,
            uniqueValues: uniqueValues.size,
            nullCount,
            sampleValues: Array.from(uniqueValues).slice(0, 5).map(v => String(v)),
          };
        });
      }

      return {
        preview: allRecords.slice(0, previewLimit),
        totalRecords: allRecords.length,
        estimatedFileSize: this.estimateFileSize(allRecords),
        fieldStats,
      };

    } catch (error) {
      this.logger.error(`Enhanced parsing failed for ${fileType}:`, error);
      throw error;
    }
  }

  /**
   * Validate file for enhanced processing
   */
  async validateFileEnhanced(
    fileType: string,
    file: Readable,
    options: ValidationOptions & {
      maxRecords?: number;
      maxFileSize?: number;
      requiredFields?: string[];
    }
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
    estimatedProcessingTime: number;
  }> {
    const processor = this.getFileProcessor(fileType);

    if (!processor) {
      return {
        isValid: false,
        errors: [`No processor available for file type: ${fileType}`],
        warnings: [],
        recommendations: [],
        estimatedProcessingTime: 0,
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Quick validation parse
      const sampleRecords = await processor.parseFile(file, 1000, {
        delimiter: options.delimiter,
      });

      const totalRecords = sampleRecords.length;

      // Check record count limits
      if (options.maxRecords && totalRecords > options.maxRecords) {
        errors.push(`File contains ${totalRecords} records, exceeding limit of ${options.maxRecords}`);
      }

      // Check required fields
      if (options.requiredFields && sampleRecords.length > 0) {
        const availableFields = Object.keys(sampleRecords[0]);
        const missingFields = options.requiredFields.filter(field => !availableFields.includes(field));

        if (missingFields.length > 0) {
          errors.push(`Missing required fields: ${missingFields.join(', ')}`);
        }
      }

      // Performance warnings
      if (totalRecords > 50000) {
        warnings.push(`Large file detected (${totalRecords} records). Processing may take several minutes.`);
        recommendations.push('Consider using chunked processing for better performance');
      }

      if (totalRecords > 10000) {
        recommendations.push('Enable progress tracking for better user experience');
      }

      // Estimate processing time (rough calculation)
      const estimatedProcessingTime = Math.ceil(totalRecords / 1000) * 1000; // ~1 second per 1000 records

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        recommendations,
        estimatedProcessingTime,
      };

    } catch (error) {
      errors.push(`Validation failed: ${error.message}`);

      return {
        isValid: false,
        errors,
        warnings,
        recommendations,
        estimatedProcessingTime: 0,
      };
    }
  }

  private getRandomSample<T>(array: T[], sampleSize: number): T[] {
    if (array.length <= sampleSize) {
      return array;
    }

    const result: T[] = [];
    const used = new Set<number>();

    while (result.length < sampleSize) {
      const randomIndex = Math.floor(Math.random() * array.length);
      if (!used.has(randomIndex)) {
        used.add(randomIndex);
        result.push(array[randomIndex]);
      }
    }

    return result;
  }

  private inferFieldType(values: any[]): string {
    if (values.length === 0) return 'unknown';

    const sampleValues = values.slice(0, 100); // Sample first 100 values

    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;
    let stringCount = 0;

    sampleValues.forEach(value => {
      const strValue = String(value).trim();

      if (strValue === 'true' || strValue === 'false') {
        booleanCount++;
      } else if (!isNaN(Number(strValue)) && strValue !== '') {
        numberCount++;
      } else if (this.isDate(strValue)) {
        dateCount++;
      } else {
        stringCount++;
      }
    });

    const total = sampleValues.length;
    const threshold = 0.8; // 80% threshold for type determination

    if (numberCount / total >= threshold) return 'long';
    if (dateCount / total >= threshold) return 'date';
    if (booleanCount / total >= threshold) return 'boolean';

    return 'text';
  }

  private isDate(value: string): boolean {
    const date = new Date(value);
    return !isNaN(date.getTime()) && value.length >= 8;
  }

  private estimateFileSize(records: Array<Record<string, any>>): number {
    if (records.length === 0) return 0;

    const sampleRecord = records[0];
    const estimatedRecordSize = JSON.stringify(sampleRecord).length;
    return records.length * estimatedRecordSize;
  }
}