/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { extname } from 'path';
import { i18n } from '@osd/i18n';
import { CoreStart } from '../../../../core/public';
import { fileParserService, FileParserConfig } from '../services/file_parser_service';
import { ImportResponse } from '../types';
import { PublicConfigSchema } from '../../config';
import { DataImporterActions, DataImporterState } from './use-data-importer-state';

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

      const response = await fileParserService.parseFile(fileToProcess, parserConfig, http);

      if (response) {
        actions.setFilePreviewData(response);

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

        notifications.toasts.addSuccess(
          i18n.translate('dataImporter.previewSuccess', {
            defaultMessage: 'Preview successful - {count} documents loaded',
            values: { count: response.documents.length },
          })
        );

        // Automatically proceed to Step 2 after successful preview
        actions.setCurrentStep(2);
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

  return {
    previewData,
    importData,
  };
};
