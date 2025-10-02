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
  const [isGroqInfoOpen, setIsGroqInfoOpen] = useState<boolean>(false);

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
            <EuiPanel
              className={canProceedToStep2 ? 'config-panel active' : 'config-panel'}
              style={{
                height: '60vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div>
                <EuiTitle size="s">
                  <h3>Data Configuration</h3>
                </EuiTitle>
                <EuiSpacer size="s" />

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
              </div>

              {/* GROQ Input - Takes remaining height */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <EuiFormRow
                  label={
                    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                      <EuiFlexItem grow={false}>Groq command (optional)</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiPopover
                          button={
                            <EuiButtonIcon
                              iconType="questionInCircle"
                              aria-label="GROQ command information"
                              size="s"
                              onClick={() => setIsGroqInfoOpen(!isGroqInfoOpen)}
                            />
                          }
                          isOpen={isGroqInfoOpen}
                          closePopover={() => setIsGroqInfoOpen(false)}
                          panelPaddingSize="m"
                          anchorPosition="downLeft"
                        >
                          <div style={{ maxWidth: '350px' }}>
                            <EuiTitle size="xs">
                              <h4>GROQ Command Help</h4>
                            </EuiTitle>
                            <EuiSpacer size="s" />
                            <EuiText size="s">
                              <p>
                                <strong>GROQ</strong> is a query language for filtering and
                                transforming your data.
                              </p>

                              <p>
                                <strong>Supported File Types:</strong>
                              </p>
                              <ul>
                                <li>✅ JSON/NDJSON - Full support</li>
                                <li>✅ CSV/TSV - After conversion to JSON</li>
                                <li>✅ YAML - After conversion to JSON</li>
                                <li>✅ XML - After conversion to JSON</li>
                                <li>⚠️ TXT - Only if contains structured data</li>
                              </ul>

                              <p>
                                <strong>Common Examples:</strong>
                              </p>
                              <ul>
                                <li>
                                  <code>*[level == "ERROR"]</code> - Filter errors
                                </li>
                                <li>
                                  <code>*[user_id == 12345]</code> - Filter by user
                                </li>
                                <li>
                                  <code>*[service match "*auth*"]</code> - Service contains "auth"
                                </li>
                                <li>
                                  <code>*[level == "ERROR"]&#123;timestamp, message&#125;</code> -
                                  Select specific fields
                                </li>
                              </ul>

                              <p>
                                <em>
                                  GROQ works on the parsed JSON structure of your data, not the raw
                                  file content.
                                </em>
                              </p>
                            </EuiText>
                          </div>
                        </EuiPopover>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  }
                  style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                >
                  <EuiTextArea
                    value={groqInput}
                    onChange={(e) => onGroqInputChange(e.target.value)}
                    placeholder="Optional: Enter GROQ queries to filter or transform your data"
                    resize="vertical"
                    style={{
                      height: showDelimiterChoice ? 'calc(100% - 80px)' : '100%',
                      minHeight: '120px',
                    }}
                  />
                </EuiFormRow>
              </div>

              {/* Delimiter Selection - Show only for CSV files */}
              {showDelimiterChoice && (
                <div>
                  <DelimiterSelect
                    onDelimiterChange={onDelimiterChange}
                    initialDelimiter={delimiter}
                  />
                </div>
              )}

              {/* Preview Button - Always at bottom */}
              <div style={{ paddingTop: '16px' }}>
                <EuiButton
                  fill
                  size="m"
                  color="success"
                  fullWidth={true}
                  isDisabled={!canProceedToStep2}
                  onClick={onPreviewClick}
                >
                  Preview
                </EuiButton>
              </div>
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
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
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
                    accept={config.enabledFileTypes.map((type) => `.${type}`).join(',')}
                  />
                </div>

                <EuiHorizontalRule margin="m" />
                <EuiText size="s" textAlign="center">
                  <strong>Or</strong>
                </EuiText>
                <EuiSpacer size="s" />

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <ImportTextContentBody
                    onTextChange={onTextInputChange}
                    enabledFileTypes={config.enabledFileTypes}
                    onFileTypeChange={onTextFileTypeChange}
                    characterLimit={config.maxTextCount}
                    initialFileType={textFileType}
                    isTextEditorInfoOpen={isTextEditorInfoOpen}
                    setIsTextEditorInfoOpen={setIsTextEditorInfoOpen}
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
