/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiFormRow,
  EuiComboBox,
  EuiButton,
  EuiFilePicker,
  EuiButtonGroup,
} from '@elastic/eui';
import { DelimiterSelect } from '../delimiter_select';
import { ImportTextContentBody } from '../import_text_content';
import { MappingConflictsBanner } from '../mapping_conflicts_banner';
import { MappingConflictsModal } from '../mapping_conflicts_modal';
import { PublicConfigSchema } from '../../../config';
import { CoreStart } from '../../../../../core/public';
import { DataSourceManagementPluginSetup } from '../../../../data_source_management/public';
import { useUploadMethod, useDataSourceSelector, useIndexManagement } from '../../hooks';
import { MappingConflict } from '../../types';

interface DataUploadStepProps {
  // Configuration
  config: PublicConfigSchema;

  // State
  indexName: string;
  inputFile: File | undefined;
  textInput: string;
  textFileType: string;
  indexOptions: Array<{ label: string }>;
  delimiter: string;
  showDelimiterChoice: boolean;
  isLoadingPreview: boolean;

  // Operations
  actions: {
    setDataSourceId: (id: string | undefined) => void;
    setDataSourceName: (name: string) => void;
    setIndexName: (name: string) => void;
    setCreateMode: (mode: boolean) => void;
    setIndexOptions: (options: Array<{ label: string }>) => void;
  };
  fileOperations: {
    onFileChange: (files: FileList | null) => void;
    onTextInputChange: (text: string) => void;
    onTextFileTypeChange: (fileType: string) => void;
    onDelimiterChange: (e: any) => void;
  };
  dataOperations: {
    previewData: () => void;
    clearConflicts: () => void;
  };

  // Services
  http: CoreStart['http'];
  savedObjects: CoreStart['savedObjects'];
  notifications: CoreStart['notifications'];
  dataSourceEnabled: boolean;
  hideLocalCluster: boolean;
  dataSourceManagement?: DataSourceManagementPluginSetup;

  // State from parent (read-only)
  dataSourceId?: string;
  dataSourceName?: string;

  // Validation
  canProceedToStep2: boolean;

  // Mapping conflicts
  mappingConflicts?: MappingConflict[];
}

export const DataUploadStep: React.FC<DataUploadStepProps> = ({
  config,
  indexName,
  inputFile,
  textInput,
  textFileType,
  indexOptions,
  delimiter,
  showDelimiterChoice,
  isLoadingPreview,
  actions,
  fileOperations,
  dataOperations,
  http,
  savedObjects,
  notifications,
  dataSourceEnabled,
  hideLocalCluster,
  dataSourceManagement,
  dataSourceId,
  dataSourceName,
  canProceedToStep2,
  mappingConflicts,
}) => {
  // Modal state for mapping conflicts
  const [isConflictsModalOpen, setIsConflictsModalOpen] = useState(false);
  // Upload method management
  const {
    uploadMethod,
    setUploadMethod,
    uploadMethodOptions,
    isTextEditorInfoOpen,
    setIsTextEditorInfoOpen,
  } = useUploadMethod({ inputFile, textInput });

  // Data source management
  const { hasValidDataSourceSelection, renderDataSourceComponent } = useDataSourceSelector({
    dataSourceEnabled,
    hideLocalCluster,
    dataSourceManagement,
    savedObjects,
    notifications,
    dataSourceId,
    dataSourceName,
    actions: {
      setDataSourceId: actions.setDataSourceId,
      setDataSourceName: actions.setDataSourceName,
    },
  });

  // Index management
  const { onIndexNameChange, onCreateIndexName } = useIndexManagement({
    http,
    notifications,
    dataSourceId,
    dataSourceName,
    indexOptions,
    hasValidDataSourceSelection,
    actions: {
      setIndexName: actions.setIndexName,
      setCreateMode: actions.setCreateMode,
      setIndexOptions: actions.setIndexOptions,
    },
  });

  return (
    <div>
      {/* Mapping conflicts banner */}
      {mappingConflicts && mappingConflicts.length > 0 && (
        <MappingConflictsBanner
          conflicts={mappingConflicts}
          onViewConflicts={() => setIsConflictsModalOpen(true)}
          onClearConflicts={dataOperations.clearConflicts}
        />
      )}

      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <p>Upload data</p>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="Upload method selection"
            options={uploadMethodOptions}
            idSelected={uploadMethod}
            onChange={(id) => setUploadMethod(id as 'file' | 'manual')}
            buttonSize="s"
            isFullWidth={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      {/* Upload Section - Top */}
      <EuiPanel
        className={`drag-drop-area ${inputFile || textInput.trim() ? 'has-file' : ''}`}
        style={{
          border: '2px dashed #D3DAE6',
          display: 'flex',
          flexDirection: 'column',
          height: '250px',
        }}
      >
        {uploadMethod === 'file' ? (
          /* File Upload Mode */
          <div
            style={{
              textAlign: 'center',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              justifyContent: 'center',
            }}
          >
            <EuiFilePicker
              id="filePickerId"
              initialPromptText="Drop files here or click to upload"
              onChange={fileOperations.onFileChange}
              display="large"
              fullWidth={true}
              aria-label="File picker"
              accept={config.enabledFileTypes.map((type) => `.${type}`).join(',')}
            />
          </div>
        ) : (
          /* Manual Entry Mode */
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <ImportTextContentBody
              onTextChange={fileOperations.onTextInputChange}
              enabledFileTypes={config.enabledFileTypes}
              onFileTypeChange={fileOperations.onTextFileTypeChange}
              characterLimit={config.maxTextCount}
              initialFileType={textFileType}
              isTextEditorInfoOpen={isTextEditorInfoOpen}
              setIsTextEditorInfoOpen={setIsTextEditorInfoOpen}
              value={textInput}
            />
          </div>
        )}
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* Delimiter Selection - Show only for CSV files */}
      {showDelimiterChoice && (
        <>
          <DelimiterSelect
            onDelimiterChange={fileOperations.onDelimiterChange}
            initialDelimiter={delimiter}
          />
          <EuiSpacer size="l" />
        </>
      )}

      {/* Configuration Section - Bottom */}
      <EuiTitle size="s">
        <h3>Configure destination</h3>
      </EuiTitle>
      <EuiSpacer size="m" />

      {/* Data Source Selection */}
      <EuiFormRow fullWidth>
        <div>{renderDataSourceComponent}</div>
      </EuiFormRow>
      <EuiSpacer size="m" />

      {/* Index Selection */}
      <EuiFormRow label="Select an existing index or create new" fullWidth>
        <EuiComboBox
          placeholder="Enter index name..."
          singleSelection={{ asPlainText: true }}
          options={indexOptions}
          selectedOptions={indexName ? [{ label: indexName }] : []}
          onChange={onIndexNameChange}
          onCreateOption={onCreateIndexName}
          fullWidth={false}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      {/* Next Button */}
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            size="m"
            iconType={isLoadingPreview ? undefined : 'arrowRight'}
            iconSide="right"
            isDisabled={!canProceedToStep2 || isLoadingPreview}
            isLoading={isLoadingPreview}
            onClick={dataOperations.previewData}
          >
            Next
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Mapping conflicts modal */}
      <MappingConflictsModal
        isOpen={isConflictsModalOpen}
        onClose={() => setIsConflictsModalOpen(false)}
        conflicts={mappingConflicts || []}
      />
    </div>
  );
};
