/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreStart } from '../../../../core/public';

export interface EnhancedImportFileOptions {
  http: CoreStart['http'];
  file: File;
  indexName: string;
  createMode: boolean;
  fileExtension: string;
  delimiter?: string;
  chunkSize?: number;
  maxRecords?: number;
  skipFirstRow?: boolean;
  selectedDataSourceId?: string;
  mapping?: Record<string, any>;
  onProgress?: (progress: { processed: number; total: number; percentage: number }) => void;
}

export interface EnhancedImportResponse {
  success: boolean;
  message: {
    total: number;
    message: string;
    failedRows: number[];
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
  };
}

export interface EnhancedPreviewOptions {
  http: CoreStart['http'];
  file: File;
  indexName: string;
  createMode: boolean;
  fileExtension: string;
  delimiter?: string;
  previewCount?: number;
  samplingRate?: number;
  skipFirstRow?: boolean;
  selectedDataSourceId?: string;
}

export interface EnhancedPreviewResponse {
  documents: Array<Record<string, any>>;
  predictedMapping: Record<string, any>;
  existingMapping: Record<string, any>;
  totalRecords: number;
  estimatedFileSize: number;
  fieldStats: Record<
    string,
    {
      type: string;
      uniqueValues: number;
      nullCount: number;
      sampleValues: string[];
    }
  >;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  estimatedProcessingTime: number;
}

/**
 * Enhanced import file function with support for large datasets, progress tracking, and performance monitoring
 */
export async function importFileEnhanced(
  options: EnhancedImportFileOptions
): Promise<EnhancedImportResponse> {
  const {
    http,
    file,
    indexName,
    createMode,
    fileExtension,
    delimiter,
    chunkSize = 1000,
    maxRecords = 100000,
    skipFirstRow = false,
    selectedDataSourceId,
    mapping,
    onProgress,
  } = options;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('indexName', indexName);
  formData.append('createMode', createMode.toString());
  formData.append('fileExtension', fileExtension);
  formData.append('chunkSize', chunkSize.toString());
  formData.append('maxRecords', maxRecords.toString());
  formData.append('skipFirstRow', skipFirstRow.toString());

  if (delimiter) {
    formData.append('delimiter', delimiter);
  }

  if (selectedDataSourceId) {
    formData.append('selectedDataSourceId', selectedDataSourceId);
  }

  if (mapping) {
    formData.append('mapping', JSON.stringify(mapping));
  }

  // Create a progress tracking function
  let progressInterval: NodeJS.Timeout | null = null;
  if (onProgress) {
    // Simulate progress tracking since we can't get real-time progress from the server easily
    // In a production setup, you'd use WebSockets or Server-Sent Events
    let currentProgress = 0;
    progressInterval = setInterval(() => {
      if (currentProgress < 90) {
        currentProgress += Math.random() * 10 + 2;
        const totalRecords = Math.ceil(file.size / 100); // Rough estimate
        const processedRecords = Math.ceil((currentProgress / 100) * totalRecords);
        onProgress({
          processed: processedRecords,
          total: totalRecords,
          percentage: Math.min(currentProgress, 90),
        });
      }
    }, 500);
  }

  try {
    const response = await http.post<{ success: boolean; message: any }>(
      '/api/data_importer/_import_file_enhanced',
      {
        body: formData,
        headers: {
          // Let the browser set the Content-Type for FormData
        },
      }
    );

    // Clear progress interval and set to 100%
    if (progressInterval) {
      clearInterval(progressInterval);
      if (onProgress && response.message) {
        onProgress({
          processed: response.message.total,
          total: response.message.total,
          percentage: 100,
        });
      }
    }

    return response as EnhancedImportResponse;
  } catch (error) {
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    throw error;
  }
}

/**
 * Enhanced preview file function with detailed statistics and sampling
 */
export async function previewFileEnhanced(
  options: EnhancedPreviewOptions
): Promise<EnhancedPreviewResponse> {
  const {
    http,
    file,
    indexName,
    createMode,
    fileExtension,
    delimiter,
    previewCount = 100,
    samplingRate = 0.1,
    skipFirstRow = false,
    selectedDataSourceId,
  } = options;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('indexName', indexName);
  formData.append('createMode', createMode.toString());
  formData.append('fileExtension', fileExtension);
  formData.append('previewCount', previewCount.toString());
  formData.append('samplingRate', samplingRate.toString());
  formData.append('skipFirstRow', skipFirstRow.toString());

  if (delimiter) {
    formData.append('delimiter', delimiter);
  }

  if (selectedDataSourceId) {
    formData.append('selectedDataSourceId', selectedDataSourceId);
  }

  const response = await http.post<EnhancedPreviewResponse>(
    '/api/data_importer/_preview_enhanced',
    {
      body: formData,
    }
  );

  return response;
}

/**
 * Validate file for enhanced processing
 */
export async function validateFileEnhanced(options: {
  http: CoreStart['http'];
  file: File;
  fileExtension: string;
  delimiter?: string;
  maxRecords?: number;
  maxFileSize?: number;
  requiredFields?: string[];
}): Promise<ValidationResult> {
  const {
    http,
    file,
    fileExtension,
    delimiter,
    maxRecords = 100000,
    maxFileSize = 100 * 1024 * 1024, // 100MB
    requiredFields,
  } = options;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileExtension', fileExtension);
  formData.append('maxRecords', maxRecords.toString());
  formData.append('maxFileSize', maxFileSize.toString());

  if (delimiter) {
    formData.append('delimiter', delimiter);
  }

  if (requiredFields) {
    formData.append('requiredFields', JSON.stringify(requiredFields));
  }

  const response = await http.post<ValidationResult>('/api/data_importer/_validate_enhanced', {
    body: formData,
  });

  return response;
}

/**
 * Progress tracking utilities
 */
export class ImportProgressTracker {
  private onProgress: (progress: {
    processed: number;
    total: number;
    percentage: number;
    status: string;
  }) => void;
  private interval: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private estimatedDuration: number = 0;

  constructor(
    onProgress: (progress: {
      processed: number;
      total: number;
      percentage: number;
      status: string;
    }) => void
  ) {
    this.onProgress = onProgress;
  }

  start(estimatedRecords: number, estimatedDurationMs: number = 30000) {
    this.startTime = Date.now();
    this.estimatedDuration = estimatedDurationMs;
    let elapsed = 0;

    this.interval = setInterval(() => {
      elapsed = Date.now() - this.startTime;
      const progress = Math.min((elapsed / this.estimatedDuration) * 90, 90); // Max 90% during processing
      const processedRecords = Math.ceil((progress / 100) * estimatedRecords);

      let status = 'Processing...';
      if (progress < 20) {
        status = 'Parsing file structure...';
      } else if (progress < 40) {
        status = 'Validating data types...';
      } else if (progress < 60) {
        status = 'Processing chunks...';
      } else if (progress < 80) {
        status = 'Indexing documents...';
      } else {
        status = 'Finalizing import...';
      }

      this.onProgress({
        processed: processedRecords,
        total: estimatedRecords,
        percentage: progress,
        status,
      });
    }, 300);
  }

  complete(actualRecords: number) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.onProgress({
      processed: actualRecords,
      total: actualRecords,
      percentage: 100,
      status: 'Import completed successfully!',
    });
  }

  error(errorMessage: string) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.onProgress({
      processed: 0,
      total: 0,
      percentage: 0,
      status: `Error: ${errorMessage}`,
    });
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

/**
 * Performance monitoring utilities
 */
export class ImportPerformanceMonitor {
  private metrics: {
    startTime: number;
    endTime?: number;
    fileSize: number;
    recordCount: number;
    chunksProcessed?: number;
    memoryUsage?: any;
  };

  constructor(fileSize: number) {
    this.metrics = {
      startTime: Date.now(),
      fileSize,
      recordCount: 0,
    };
  }

  updateRecordCount(count: number) {
    this.metrics.recordCount = count;
  }

  complete(result: EnhancedImportResponse) {
    this.metrics.endTime = Date.now();
    this.metrics.chunksProcessed = result.message.chunksProcessed;
    this.metrics.memoryUsage = result.message.memoryUsage;
  }

  getPerformanceReport(): {
    duration: number;
    throughput: number;
    efficiency: string;
    recommendations: string[];
  } {
    const duration = (this.metrics.endTime || Date.now()) - this.metrics.startTime;
    const throughput = this.metrics.recordCount / (duration / 1000); // records per second

    const recommendations: string[] = [];
    let efficiency = 'Good';

    if (throughput < 100) {
      efficiency = 'Poor';
      recommendations.push('Consider using smaller chunk sizes for better performance');
      recommendations.push('Check system resources and network connectivity');
    } else if (throughput < 500) {
      efficiency = 'Fair';
      recommendations.push('Performance could be improved with larger chunk sizes');
    } else if (throughput > 2000) {
      efficiency = 'Excellent';
    }

    if (this.metrics.fileSize > 50 * 1024 * 1024) {
      // 50MB
      recommendations.push('For files this large, consider processing during off-peak hours');
    }

    return {
      duration,
      throughput: Math.round(throughput),
      efficiency,
      recommendations,
    };
  }
}
