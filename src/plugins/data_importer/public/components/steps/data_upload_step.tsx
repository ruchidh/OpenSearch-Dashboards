/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  EuiPageContent,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiFormRow,
  EuiComboBox,
  EuiTextArea,
  EuiButton,
  EuiFilePicker,
  EuiHorizontalRule,
  EuiButtonIcon,
  EuiPopover,
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
  groqInput: string;
  delimiter: string;
  showDelimiterChoice: boolean;

  // Callbacks
  onIndexNameChange: (selected: Array<{ label: string }>) => void;
  onCreateIndexName: (createdOption: string) => void;
  onFileChange: (files: FileList | null) => void;
  onTextInputChange: (text: string) => void;
  onTextFileTypeChange: (fileType: string) => void;
  onDelimiterChange: (e: any) => void;
  onGroqInputChange: (text: string) => void;
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
  groqInput,
  delimiter,
  showDelimiterChoice,
  onIndexNameChange,
  onCreateIndexName,
  onFileChange,
  onTextInputChange,
  onTextFileTypeChange,
  onDelimiterChange,
  onGroqInputChange,
  onPreviewClick,
  canProceedToStep2,
  renderDataSourceComponent,
  renderStepProgress,
}) => {
  const [isTextEditorInfoOpen, setIsTextEditorInfoOpen] = useState<boolean>(false);

  return (
    <EuiPageContent paddingSize="s">
      <div className="wizard-step-container">
        {renderStepProgress()}

        <EuiTitle size="xs">
          <p>Step 1: Select Data Source & Upload Data</p>
        </EuiTitle>
        <EuiText color="subdued" size="s">
          <p>
            Choose your data source, target index, and upload your data file or enter text directly.
          </p>
        </EuiText>

        <EuiSpacer size="s" />

        <EuiFlexGroup>
          {/* Left Panel - Configuration */}
          <EuiFlexItem grow={1} style={{ maxWidth: '400px' }}>
            <EuiPanel className={canProceedToStep2 ? 'config-panel active' : 'config-panel'}>
              <EuiTitle size="s">
                <h3>Data Configuration</h3>
              </EuiTitle>
              <EuiSpacer size="m" />

              {/* Data Source Selection - Always show current data source */}
              <EuiFormRow label="Data source">
                <div>{renderDataSourceComponent}</div>
              </EuiFormRow>

              {/* Index Selection */}
              <EuiFormRow label="Select/create index">
                <EuiComboBox
                  placeholder="Enter index name..."
                  singleSelection={{ asPlainText: true }}
                  options={indexOptions}
                  selectedOptions={indexName ? [{ label: indexName }] : []}
                  onChange={onIndexNameChange}
                  onCreateOption={onCreateIndexName}
                />
              </EuiFormRow>

              {/* GROQ Input - Optional */}
              <EuiFormRow
                label="Groq command"
                helpText="Optional: Enter GROQ queries"
              >
                <EuiTextArea
                  value={groqInput}
                  onChange={(e) => onGroqInputChange(e.target.value)}
                  placeholder="Optional: Enter GROQ queries or delimiter settings..."
                  rows={4}
                  resize="vertical"
                />
              </EuiFormRow>

              {/* Delimiter Selection - Show only for CSV files */}
              {showDelimiterChoice && (
                <DelimiterSelect
                  onDelimiterChange={onDelimiterChange}
                  initialDelimiter={delimiter}
                />
              )}

              <EuiSpacer size="m" />

              <EuiButton
                fill
                size="s"
                color="success"
                isDisabled={!canProceedToStep2}
                onClick={onPreviewClick}
              >
                Preview
              </EuiButton>
            </EuiPanel>
          </EuiFlexItem>

          {/* Right Panel - File Upload */}
          <EuiFlexItem grow={2}>
            <EuiPanel
              className={`drag-drop-area ${inputFile || textInput.trim() ? 'has-file' : ''}`}
              style={{
                height: '60vh',
                border: '2px dashed #D3DAE6',
                width: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{
                textAlign: 'center',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
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
                    accept={config.enabledFileTypes.map(type => `.${type}`).join(',')}
                  />
                </div>

                <EuiHorizontalRule margin="m" />
                <EuiText size="s" textAlign="center">
                  <strong>Or</strong>
                </EuiText>
                <EuiSpacer size="s" />

                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                    <EuiPopover
                      button={
                        <EuiButtonIcon
                          iconType="questionInCircle"
                          aria-label="Text editor information"
                          size="s"
                          onClick={() => setIsTextEditorInfoOpen(!isTextEditorInfoOpen)}
                        />
                      }
                      isOpen={isTextEditorInfoOpen}
                      closePopover={() => setIsTextEditorInfoOpen(false)}
                      panelPaddingSize="m"
                      anchorPosition="leftCenter"
                    >
                      <div style={{ maxWidth: '300px' }}>
                        <EuiTitle size="xs">
                          <h4>Text Editor Information</h4>
                        </EuiTitle>
                        <EuiSpacer size="s" />
                        <EuiText size="s">
                          <p>
                            <strong>Character Limit:</strong> 1,000,000 characters
                          </p>
                          <p>
                            <strong>Supported Formats:</strong> JSON, CSV, NDJSON, TXT
                          </p>
                          <p>
                            <strong>File Size Equivalent:</strong> ~1MB of text data
                          </p>
                          <p>
                            <strong>Typical Usage:</strong>
                          </p>
                          <ul>
                            <li>Small CSV: ~10,000-50,000 characters</li>
                            <li>Medium JSON: ~100,000-300,000 characters</li>
                            <li>Large dataset: Up to 1,000,000 characters</li>
                          </ul>
                          <p>
                            <em>
                              The editor will show a character counter and highlight when
                              approaching the limit.
                            </em>
                          </p>
                        </EuiText>
                      </div>
                    </EuiPopover>
                  </div>
                  <ImportTextContentBody
                    onTextChange={onTextInputChange}
                    enabledFileTypes={config.enabledFileTypes}
                    onFileTypeChange={onTextFileTypeChange}
                    characterLimit={config.maxTextCount}
                    initialFileType={textFileType}
                  />
                </div>
              </div>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPageContent>
  );
};