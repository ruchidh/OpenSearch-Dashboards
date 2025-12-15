/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import { IRouter } from '../../../../core/server';
import { DataImporterPluginSetup } from '../types';
import { EnhancedFileProcessorService, EnhancedIngestOptions } from '../processors/enhanced_file_processor_service';

export function registerEnhancedImportFileRoute(
  router: IRouter,
  fileProcessorService: EnhancedFileProcessorService
) {
  router.post(
    {
      path: '/api/data_importer/_import_file_enhanced',
      validate: {
        body: schema.object({
          indexName: schema.string(),
          createMode: schema.boolean({ defaultValue: false }),
          fileExtension: schema.string(),
          delimiter: schema.maybe(schema.string()),
          chunkSize: schema.maybe(schema.number({ defaultValue: 1000, min: 100, max: 10000 })),
          maxRecords: schema.maybe(schema.number({ defaultValue: 100000, min: 1, max: 1000000 })),
          skipFirstRow: schema.maybe(schema.boolean({ defaultValue: false })),
          selectedDataSourceId: schema.maybe(schema.string()),
          mapping: schema.maybe(schema.recordOf(schema.string(), schema.any())),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const {
          indexName,
          createMode,
          fileExtension,
          delimiter,
          chunkSize,
          maxRecords,
          skipFirstRow,
          selectedDataSourceId,
          mapping,
        } = request.body;

        // Get OpenSearch client
        const client = selectedDataSourceId
          ? context.dataSource?.opensearch?.client
          : context.core.opensearch.client.asCurrentUser;

        if (!client) {
          return response.badRequest({ body: 'OpenSearch client not available' });
        }

        // Get file from multipart request
        const files = request.files;
        if (!files || !files.file) {
          return response.badRequest({ body: 'No file uploaded' });
        }

        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        const fileStream = file.content;

        const options: EnhancedIngestOptions = {
          client,
          indexName,
          createMode,
          delimiter,
          chunkSize,
          maxRecords,
          skipFirstRow,
          dataSourceId: selectedDataSourceId,
          mapping,
          progressCallback: (progress) => {
            // In a real implementation, this could use WebSockets or SSE
            // to send progress updates to the client
            context.logger?.info(`Import progress: ${progress.percentage}% (${progress.processed}/${progress.total})`);
          },
        };

        const result = await fileProcessorService.ingestFileEnhanced(
          fileExtension.replace('.', ''),
          fileStream,
          options
        );

        return response.ok({
          body: {
            success: result.success,
            message: result,
          },
        });

      } catch (error) {
        context.logger?.error('Enhanced import file error:', error);

        return response.customError({
          statusCode: 500,
          body: {
            message: error.message,
            error: error.stack,
          },
        });
      }
    }
  );
}

export function registerEnhancedPreviewRoute(
  router: IRouter,
  fileProcessorService: EnhancedFileProcessorService
) {
  router.post(
    {
      path: '/api/data_importer/_preview_enhanced',
      validate: {
        body: schema.object({
          indexName: schema.string(),
          createMode: schema.boolean({ defaultValue: false }),
          fileExtension: schema.string(),
          delimiter: schema.maybe(schema.string()),
          previewCount: schema.maybe(schema.number({ defaultValue: 100, min: 10, max: 1000 })),
          samplingRate: schema.maybe(schema.number({ defaultValue: 0.1, min: 0.01, max: 1.0 })),
          skipFirstRow: schema.maybe(schema.boolean({ defaultValue: false })),
          selectedDataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const {
          indexName,
          createMode,
          fileExtension,
          delimiter,
          previewCount,
          samplingRate,
          skipFirstRow,
          selectedDataSourceId,
        } = request.body;

        // Get OpenSearch client
        const client = selectedDataSourceId
          ? context.dataSource?.opensearch?.client
          : context.core.opensearch.client.asCurrentUser;

        if (!client) {
          return response.badRequest({ body: 'OpenSearch client not available' });
        }

        // Get file from multipart request
        const files = request.files;
        if (!files || !files.file) {
          return response.badRequest({ body: 'No file uploaded' });
        }

        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        const fileStream = file.content;

        const result = await fileProcessorService.parseFileEnhanced(
          fileExtension.replace('.', ''),
          fileStream,
          {
            previewLimit: previewCount,
            samplingRate,
            skipFirstRow,
            delimiter,
          }
        );

        // Get existing mapping if index exists and not in create mode
        let existingMapping = {};
        if (!createMode) {
          try {
            const mappingResponse = await client.indices.getMapping({
              index: indexName,
            });
            existingMapping = mappingResponse.body[indexName]?.mappings?.properties || {};
          } catch (error) {
            // Index doesn't exist or other error - continue without existing mapping
            context.logger?.debug(`Could not retrieve existing mapping for index ${indexName}:`, error);
          }
        }

        // Generate predicted mapping based on field statistics
        const predictedMapping: Record<string, any> = {};
        Object.entries(result.fieldStats).forEach(([fieldName, stats]) => {
          predictedMapping[fieldName] = {
            type: stats.type,
          };

          // Add additional mapping properties based on field type
          if (stats.type === 'text') {
            predictedMapping[fieldName].fields = {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
              },
            };
          }
        });

        return response.ok({
          body: {
            documents: result.preview,
            predictedMapping,
            existingMapping,
            totalRecords: result.totalRecords,
            estimatedFileSize: result.estimatedFileSize,
            fieldStats: result.fieldStats,
          },
        });

      } catch (error) {
        context.logger?.error('Enhanced preview error:', error);

        return response.customError({
          statusCode: 500,
          body: {
            message: error.message,
            error: error.stack,
          },
        });
      }
    }
  );
}

export function registerEnhancedValidationRoute(
  router: IRouter,
  fileProcessorService: EnhancedFileProcessorService
) {
  router.post(
    {
      path: '/api/data_importer/_validate_enhanced',
      validate: {
        body: schema.object({
          fileExtension: schema.string(),
          delimiter: schema.maybe(schema.string()),
          maxRecords: schema.maybe(schema.number({ defaultValue: 100000 })),
          maxFileSize: schema.maybe(schema.number({ defaultValue: 100 * 1024 * 1024 })), // 100MB
          requiredFields: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const {
          fileExtension,
          delimiter,
          maxRecords,
          maxFileSize,
          requiredFields,
        } = request.body;

        // Get file from multipart request
        const files = request.files;
        if (!files || !files.file) {
          return response.badRequest({ body: 'No file uploaded' });
        }

        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        const fileStream = file.content;

        const result = await fileProcessorService.validateFileEnhanced(
          fileExtension.replace('.', ''),
          fileStream,
          {
            delimiter,
            maxRecords,
            maxFileSize,
            requiredFields,
          }
        );

        return response.ok({
          body: result,
        });

      } catch (error) {
        context.logger?.error('Enhanced validation error:', error);

        return response.customError({
          statusCode: 500,
          body: {
            message: error.message,
            error: error.stack,
          },
        });
      }
    }
  );
}