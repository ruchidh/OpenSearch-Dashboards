/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  EuiPageContent,
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
import { PublicConfigSchema } from '../../../config';

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

  // Callbacks
  onIndexNameChange: (selected: Array<{ label: string }>) => void;
  onCreateIndexName: (createdOption: string) => void;
  onFileChange: (files: FileList | null) => void;
  onTextInputChange: (text: string) => void;
  onTextFileTypeChange: (fileType: string) => void;
  onDelimiterChange: (e: any) => void;
  onPreviewClick: () => void;

  // Validation
  canProceedToStep2: boolean;

  // UI Components
  renderDataSourceComponent: React.ReactNode;
  renderStepProgress: () => React.ReactNode;
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
  onIndexNameChange,
  onCreateIndexName,
  onFileChange,
  onTextInputChange,
  onTextFileTypeChange,
  onDelimiterChange,
  onPreviewClick,
  canProceedToStep2,
  renderDataSourceComponent,
  renderStepProgress,
}) => {
  const [isTextEditorInfoOpen, setIsTextEditorInfoOpen] = useState<boolean>(false);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'manual'>('file');

  // Auto-update upload method based on content
  useEffect(() => {
    if (inputFile) {
      setUploadMethod('file');
    } else if (textInput.trim()) {
      setUploadMethod('manual');
    }
  }, [inputFile, textInput]);

  const uploadMethodOptions = [
    {
      id: 'file',
      label: 'Upload by file',
    },
    {
      id: 'manual',
      label: 'Enter manually',
    },
  ];

  return (
    <EuiPageContent paddingSize="s">
      <div className="wizard-step-container">
        {renderStepProgress()}

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
                onChange={onFileChange}
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
                onTextChange={onTextInputChange}
                enabledFileTypes={config.enabledFileTypes}
                onFileTypeChange={onTextFileTypeChange}
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
            <DelimiterSelect onDelimiterChange={onDelimiterChange} initialDelimiter={delimiter} />
            <EuiSpacer size="l" />
          </>
        )}

        {/* Configuration Section - Bottom */}
        <EuiTitle size="s">
          <h3>Configure destination</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        {/* Data Source Selection */}
        <EuiFormRow label="Data source" fullWidth>
          <div>{renderDataSourceComponent}</div>
        </EuiFormRow>
        <EuiSpacer size="s" />

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

        <EuiSpacer size="s" />

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
              onClick={onPreviewClick}
            >
              Next
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPageContent>
  );
};
