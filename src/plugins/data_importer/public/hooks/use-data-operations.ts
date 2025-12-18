/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { extname } from 'path';
import { i18n } from '@osd/i18n';
import { CoreStart } from '../../../../core/public';
import { fileParserService, FileParserConfig } from '../services/file_parser_service';
import { ImportResponse, MappingConflict, PreviewResponse } from '../types';
import { PublicConfigSchema } from '../../config';
import { DataImporterActions, DataImporterState } from './use-data-importer-state';
import { SimpleGROQProcessor } from '../utils/groq-processor';

// Helper function to recursively compare mapping properties
const compareProperties = (
  existingProps: any,
  predictedProps: any,
  parentPath: string = ''
): MappingConflict[] => {
  const conflicts: MappingConflict[] = [];

  Object.keys(predictedProps).forEach((fieldName) => {
    const fullFieldPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;

    if (existingProps[fieldName]) {
      const existingField = existingProps[fieldName];
      const predictedField = predictedProps[fieldName];

      const existingType = existingField.type;
      const predictedType = predictedField.type;

      // Check for direct type conflicts
      if (existingType !== predictedType) {
        conflicts.push({
          fieldName: fullFieldPath,
          uploadedType: predictedType,
          destinationType: existingType,
        });
      }
      // If both are objects, recursively check their properties
      else if (existingType === 'object' && predictedType === 'object') {
        if (existingField.properties && predictedField.properties) {
          const nestedConflicts = compareProperties(
            existingField.properties,
            predictedField.properties,
            fullFieldPath
          );
          conflicts.push(...nestedConflicts);
        }
      }
      // Handle nested properties case where one has nested properties and other doesn't
      else if (existingField.properties && predictedField.properties && existingType === predictedType) {
        const nestedConflicts = compareProperties(
          existingField.properties,
          predictedField.properties,
          fullFieldPath
        );
        conflicts.push(...nestedConflicts);
      }
    }
  });

  return conflicts;
};

// Helper function to detect mapping conflicts
const detectMappingConflicts = (response: PreviewResponse): PreviewResponse => {
  // If no existing mapping, there are no conflicts
  if (!response.existingMapping?.properties || !response.predictedMapping?.properties) {
    return response;
  }

  const existingProps = response.existingMapping.properties;
  const predictedProps = response.predictedMapping.properties;

  // Use recursive comparison to detect conflicts at all levels
  const conflicts = compareProperties(existingProps, predictedProps);

  // Return enhanced response with conflict information
  return {
    ...response,
    hasConflicts: conflicts.length > 0,
    mappingConflicts: conflicts,
  };
};

interface UseDataOperationsProps {
  state: DataImporterState;
  actions: DataImporterActions;
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
  config: PublicConfigSchema;
}

export const useDataOperations = ({
  state,
  actions,
  http,
  notifications,
  config,
}: UseDataOperationsProps) => {
  const previewData = useCallback(async () => {
    if ((!state.inputFile && !state.textInput.trim()) || !state.indexName) return;

    actions.setIsLoadingPreview(true);

    try {
      let fileToProcess: File;
      let fileExtension: string;

      if (state.inputFile) {
        fileToProcess = state.inputFile;
        fileExtension = extname(state.inputFile.name);
      } else if (state.textInput.trim()) {
        // Create a virtual file from text input using the file parser service
        fileToProcess = fileParserService.createFileFromText(state.textInput, state.textFileType);
        fileExtension = extname(fileToProcess.name);
      } else {
        return;
      }

      const parserConfig: FileParserConfig = {
        fileExtension,
        indexName: state.indexName,
        createMode: state.createMode,
        delimiter: state.delimiter,
        selectedDataSourceId: state.dataSourceId,
        previewCount: config.filePreviewDocumentsCount,
      };

      const rawResponse = await fileParserService.parseFile(fileToProcess, parserConfig, http);

      if (rawResponse) {
        // Detect mapping conflicts before processing
        const response = detectMappingConflicts(rawResponse);

        actions.setFilePreviewData(response);
        // Store original data for GROQ filtering
        actions.setOriginalFilePreviewData(response);

        // Extract available time fields - check for various date field types
        const timeFieldCandidates = Object.keys(response.predictedMapping?.properties || {}).filter(
          (field) => {
            const fieldType = response.predictedMapping?.properties?.[field]?.type;
            // Check for various date/time field types
            return (
              fieldType === 'date' ||
              fieldType === 'date_nanos' ||
              field.toLowerCase().includes('time') ||
              field.toLowerCase().includes('date') ||
              field === 'timestamp' ||
              field === '@timestamp'
            );
          }
        );
        actions.setAvailableTimeFields(timeFieldCandidates);
        if (timeFieldCandidates.length > 0) {
          // Prefer @timestamp or timestamp, otherwise use the first one
          const preferredField =
            timeFieldCandidates.find((f) => f === '@timestamp' || f === 'timestamp') ||
            timeFieldCandidates[0];
          actions.setTimeField(preferredField);
        }

        // Check for mapping conflicts
        if (response.hasConflicts && response.mappingConflicts && response.mappingConflicts.length > 0) {
          // Stay on Step 1 and show conflicts - DO NOT proceed to step 2
          notifications.toasts.addWarning(
            i18n.translate('dataImporter.previewConflicts', {
              defaultMessage: 'Preview loaded with mapping conflicts - {count} conflicts found. Resolve conflicts to proceed.',
              values: { count: response.mappingConflicts.length },
            })
          );

          // Ensure we stay on step 1
          actions.setCurrentStep(1);

          // Scroll to top to show the conflict banner
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          notifications.toasts.addSuccess(
            i18n.translate('dataImporter.previewSuccess', {
              defaultMessage: 'Preview successful - {count} documents loaded',
              values: { count: response.documents.length },
            })
          );

          // Only proceed to Step 2 if no conflicts
          actions.setCurrentStep(2);
        }
      }
    } catch (error) {
      const errorMessage = error.body?.message ?? error;
      notifications.toasts.addDanger(
        i18n.translate('dataImporter.previewError', {
          defaultMessage: 'Preview failed: {errorMessage}',
          values: { errorMessage },
        })
      );
    } finally {
      actions.setIsLoadingPreview(false);
    }
  }, [state, actions, http, notifications, config]);

  const importData = useCallback(
    async (fetchIndices: () => Promise<void>) => {
      if ((!state.inputFile && !state.textInput.trim()) || !state.indexName) return;

      actions.setIsImporting(true);
      actions.setImportErrors([]);

      try {
        let response: ImportResponse | undefined;
        let fileToProcess: File;
        let fileExtension: string;

        if (state.inputFile) {
          fileToProcess = state.inputFile;
          fileExtension = extname(state.inputFile.name);
        } else if (state.textInput.trim()) {
          // Create a virtual file from text input using the file parser service
          fileToProcess = fileParserService.createFileFromText(state.textInput, state.textFileType);
          fileExtension = extname(fileToProcess.name);
        } else {
          return;
        }

        const parserConfig: FileParserConfig = {
          fileExtension,
          indexName: state.indexName,
          createMode: state.createMode,
          delimiter: state.delimiter,
          selectedDataSourceId: state.dataSourceId,
          mapping: state.filePreviewData.predictedMapping,
        };

        response = await fileParserService.importFile(fileToProcess, parserConfig, http);

        if (response && response.success) {
          actions.setImportStats({
            totalDocs: response.message.total || state.filePreviewData.documents.length,
            indexSize: state.inputFile
              ? `${Math.round(((state.inputFile.size || 0) / 1024 / 1024) * 100) / 100} MB`
              : `${Math.round((new Blob([state.textInput]).size / 1024 / 1024) * 100) / 100} MB`,
            timestamp: new Date().toLocaleString(),
          });

          notifications.toasts.addSuccess(
            i18n.translate('dataImporter.dataImported', {
              defaultMessage: '{total} documents successfully imported into {indexName}',
              values: {
                total: response.message.total,
                indexName: state.indexName,
              },
            })
          );

          actions.setCurrentStep(3);
          await fetchIndices();
        }
      } catch (error) {
        const errorMessage = error.body?.message ?? error;
        actions.setImportErrors([
          {
            error: 'Import Error',
            message: errorMessage,
          },
        ]);

        notifications.toasts.addDanger(
          i18n.translate('dataImporter.dataImportError', {
            defaultMessage: 'Data import failed: {errorMessage}',
            values: { errorMessage },
          })
        );
      } finally {
        actions.setIsImporting(false);
      }
    },
    [state, actions, http, notifications]
  );

  const updatePreviewWithGroq = useCallback(async () => {
    if (!state.originalFilePreviewData || !state.originalFilePreviewData.documents) {
      notifications.toasts.addWarning(
        i18n.translate('dataImporter.groqNoData', {
          defaultMessage: 'No preview data available to filter',
        })
      );
      return;
    }

    actions.setIsLoadingPreview(true);

    try {
      const originalDocuments = state.originalFilePreviewData.documents;
      const groqQuery = state.groqInput?.trim();

      if (!groqQuery) {
        // If no GROQ query, show original data
        actions.setFilePreviewData({
          ...state.originalFilePreviewData,
          documents: originalDocuments,
        });
        notifications.toasts.addSuccess(
          i18n.translate('dataImporter.groqClearSuccess', {
            defaultMessage: 'Preview cleared - showing original data ({count} documents)',
            values: { count: originalDocuments.length },
          })
        );
        return;
      }

      // Process GROQ query
      const result = SimpleGROQProcessor.process(originalDocuments, groqQuery);

      if (result.success) {
        // Update preview with filtered data, keeping original mapping
        actions.setFilePreviewData({
          ...state.originalFilePreviewData,
          documents: result.data,
        });

        notifications.toasts.addSuccess(
          i18n.translate('dataImporter.groqSuccess', {
            defaultMessage: 'GROQ query applied - {count} documents match the filter',
            values: { count: result.data.length },
          })
        );
      } else {
        // Show error but keep current data
        notifications.toasts.addDanger(
          i18n.translate('dataImporter.groqError', {
            defaultMessage: 'GROQ query failed: {error}',
            values: { error: result.error },
          })
        );
      }
    } catch (error) {
      const errorMessage = error.message || 'Unknown error occurred';
      notifications.toasts.addDanger(
        i18n.translate('dataImporter.groqProcessingError', {
          defaultMessage: 'Failed to process GROQ query: {errorMessage}',
          values: { errorMessage },
        })
      );
    } finally {
      actions.setIsLoadingPreview(false);
    }
  }, [state.originalFilePreviewData, state.groqInput, actions, notifications]);

  const clearConflicts = useCallback(() => {
    // Clear all preview data to reset conflicts and allow user to reupload
    actions.setFilePreviewData({ documents: [], predictedMapping: {} });
    actions.setOriginalFilePreviewData({ documents: [], predictedMapping: {} });

    notifications.toasts.addSuccess(
      i18n.translate('dataImporter.conflictsCleared', {
        defaultMessage: 'Conflicts cleared. You can now upload a new file or select a different index.',
      })
    );
  }, [actions, notifications]);

  return {
    previewData,
    importData,
    updatePreviewWithGroq,
    clearConflicts,
  };
};
