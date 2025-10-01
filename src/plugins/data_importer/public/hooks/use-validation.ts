/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo } from 'react';
import { i18n } from '@osd/i18n';
import { CoreStart } from '../../../../core/public';
import { PublicConfigSchema } from '../../config';
import { DataImporterState } from './use-data-importer-state';

interface UseValidationProps {
  state: DataImporterState;
  config: PublicConfigSchema;
  notifications: CoreStart['notifications'];
  dataSourceEnabled: boolean;
}

export const useValidation = ({
  state,
  config,
  notifications,
  dataSourceEnabled,
}: UseValidationProps) => {

  // File size and text length validation
  useEffect(() => {
    if (state.inputFile && state.inputFile.size > config.maxFileSizeBytes) {
      notifications.toasts.addDanger(
        i18n.translate('dataImporter.fileTooLarge', {
          defaultMessage: 'File is too large. Maximum size allowed is {maxSize} MB.',
          values: { maxSize: Math.round(config.maxFileSizeBytes / (1024 * 1024)) },
        })
      );
    }

    if (state.textInput && state.textInput.length > config.maxTextCount) {
      notifications.toasts.addDanger(
        i18n.translate('dataImporter.textTooLong', {
          defaultMessage: 'Text exceeds {maxTextCount} characters',
          values: { maxTextCount: config.maxTextCount },
        })
      );
    }
  }, [state.inputFile, state.textInput, config.maxFileSizeBytes, config.maxTextCount, notifications.toasts]);

  // Validation computed values
  const validation = useMemo(() => {
    const hasValidIndex = Boolean(state.indexName && state.indexName.trim());
    const hasValidFile = Boolean(state.inputFile && state.inputFile.size <= config.maxFileSizeBytes);
    const hasValidText = Boolean(state.textInput && state.textInput.trim() && state.textInput.length <= config.maxTextCount);
    const hasValidData = hasValidFile || hasValidText;
    const hasValidDataSource = !dataSourceEnabled || Boolean(state.dataSourceId || state.dataSourceName);
    const canProceedToStep2 = hasValidIndex && hasValidData && hasValidDataSource;
    const canProceedToStep3 = state.filePreviewData.documents.length > 0;

    return {
      hasValidIndex,
      hasValidFile,
      hasValidText,
      hasValidData,
      hasValidDataSource,
      canProceedToStep2,
      canProceedToStep3,
    };
  }, [
    state.indexName,
    state.inputFile,
    state.textInput,
    state.dataSourceId,
    state.dataSourceName,
    state.filePreviewData.documents.length,
    config.maxFileSizeBytes,
    config.maxTextCount,
    dataSourceEnabled,
  ]);

  return validation;
};