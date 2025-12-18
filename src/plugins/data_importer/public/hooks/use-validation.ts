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

    // Check if we have a successful predicted mapping (for internal validation)
    const hasSuccessfulPreview = Boolean(
      state.filePreviewData.predictedMapping &&
      Object.keys(state.filePreviewData.predictedMapping).length > 0 &&
      state.filePreviewData.documents &&
      state.filePreviewData.documents.length > 0
    );

    // Check if conflicts exist after API response
    const hasActiveConflicts = Boolean(
      state.filePreviewData.hasConflicts &&
      state.filePreviewData.mappingConflicts &&
      state.filePreviewData.mappingConflicts.length > 0
    );

    // Basic validation for enabling "Next" button initially (before API call)
    const hasBasicRequirements = hasValidIndex && hasValidData && hasValidDataSource;

    // Full validation: either no preview yet (allow API call) OR successful preview with no conflicts
    const canProceedToStep2 = hasBasicRequirements && (!hasSuccessfulPreview || !hasActiveConflicts);
    const canProceedToStep3 = state.filePreviewData.documents.length > 0;

    return {
      hasValidIndex,
      hasValidFile,
      hasValidText,
      hasValidData,
      hasValidDataSource,
      hasSuccessfulPreview,
      hasActiveConflicts,
      hasBasicRequirements,
      canProceedToStep2,
      canProceedToStep3,
    };
  }, [
    state.indexName,
    state.inputFile,
    state.textInput,
    state.dataSourceId,
    state.dataSourceName,
    state.filePreviewData.documents,
    state.filePreviewData.predictedMapping,
    state.filePreviewData.hasConflicts,
    state.filePreviewData.mappingConflicts,
    config.maxFileSizeBytes,
    config.maxTextCount,
    dataSourceEnabled,
  ]);

  return validation;
};