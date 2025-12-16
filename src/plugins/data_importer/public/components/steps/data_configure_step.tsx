/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import uuid from 'uuid';
import {
  EuiPageContent,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiSpacer,
  EuiButton,
  EuiLoadingSpinner,
  EuiButtonIcon,
  EuiPopover,
  EuiText,
  EuiCodeEditor,
} from '@elastic/eui';
import { EnhancedPreviewComponent } from '../enhanced_preview_table';
import { PreviewResponse } from '../../types';

interface DataConfigureStepProps {
  // State
  dataSourceName: string;
  dataSourceEnabled: boolean;
  indexName: string;
  timeField: string;
  availableTimeFields: string[];
  filePreviewData: PreviewResponse;
  isLoadingPreview: boolean;
  isImporting: boolean;
  groqInput?: string;
  delimiter?: string;
  showDelimiterChoice?: boolean;

  // Callbacks
  onBackToUpload: () => void;
  onClear: () => void;
  onImport: () => void;
  onTimeFieldChange: (selected: Array<{ label: string }>) => void;
  onGroqInputChange: (text: string) => void;

  // Validation
  canProceedToStep3: boolean;

  // UI Components
  renderStepProgress: () => React.ReactNode;
}

export const DataConfigureStep: React.FC<DataConfigureStepProps> = ({
  dataSourceName,
  dataSourceEnabled,
  indexName,
  timeField,
  availableTimeFields,
  filePreviewData,
  isLoadingPreview,
  isImporting,
  groqInput,
  delimiter,
  showDelimiterChoice,
  onBackToUpload,
  onClear,
  onImport,
  onTimeFieldChange,
  onGroqInputChange,
  canProceedToStep3,
  renderStepProgress,
}) => {
  const [isGroqInfoOpen, setIsGroqInfoOpen] = useState<boolean>(false);

  // Check if data formatting section should be shown
  const hasDataFormatting = (groqInput && groqInput.trim()) || showDelimiterChoice;
  return (
    <EuiPageContent paddingSize="s">
      <div className="wizard-step-container">
        {renderStepProgress()}
        <EuiSpacer size="m" />

        <EuiFlexGroup>
          {/* Left Panel - Configuration Sections */}
          <EuiFlexItem grow={1} style={{ maxWidth: '400px' }}>
            {/* Combined Data Configuration and Formatting Panel */}
            <EuiPanel style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{ flex: '1 1 auto', overflow: 'auto', paddingRight: '8px', minHeight: 0 }}
              >
                <EuiTitle size="s">
                  <h3>Import data to</h3>
                </EuiTitle>
                <EuiSpacer size="m" />

                <EuiFormRow label="Datasource">
                  <EuiFieldText
                    value={
                      dataSourceName ||
                      (dataSourceEnabled ? 'No data source selected' : 'Local Cluster')
                    }
                    readOnly
                  />
                </EuiFormRow>

                <EuiFormRow label="Index">
                  <EuiFieldText value={indexName} readOnly />
                </EuiFormRow>

                <EuiSpacer size="l" />

                {/* Additional Settings Section */}
                <EuiTitle size="xs">
                  <h4>Additional settings</h4>
                </EuiTitle>
                <EuiSpacer size="m" />

                <EuiFormRow
                  label="Time field - optional"
                  helpText="Select a time field for time-based filtering in Discover and Visualizations"
                >
                  <EuiComboBox
                    placeholder="@timestamp"
                    singleSelection={{ asPlainText: true }}
                    options={availableTimeFields.map((field) => ({ label: field }))}
                    selectedOptions={timeField ? [{ label: timeField }] : []}
                    onChange={onTimeFieldChange}
                    isClearable={true}
                  />
                </EuiFormRow>

                {/* GROQ Input */}
                <EuiFormRow
                  label={
                    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                      <EuiFlexItem grow={false}>Groq command - optional</EuiFlexItem>
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
                >
                  <div
                    style={{
                      height: '120px',
                      border: '1px solid #D3DAE6',
                      borderRadius: '6px',
                    }}
                  >
                    <EuiCodeEditor
                      id={uuid.v4()}
                      onChange={onGroqInputChange}
                      width={'100%'}
                      height="120px"
                      value={groqInput || '{}'}
                      mode="json"
                    />
                  </div>
                </EuiFormRow>
              </div>

              {/* Action Buttons - Pinned to bottom */}
              <div>
                {/* Update preview and Back buttons row */}
                <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButton iconType="refresh" size="s" onClick={onClear}>
                      Update preview
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton iconType="arrowLeft" size="s" onClick={onBackToUpload}>
                      Back
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="s" />

                {/* Import button row - full width */}
                <EuiButton
                  fill
                  color="primary"
                  size="s"
                  fullWidth={true}
                  onClick={onImport}
                  isLoading={isImporting}
                  isDisabled={!canProceedToStep3}
                >
                  Import
                </EuiButton>
              </div>
            </EuiPanel>
          </EuiFlexItem>

          {/* Right Panel - Preview and Errors */}
          <EuiFlexItem grow={2}>
            {/* Preview Panel */}
            <EuiPanel>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h3>Preview</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton iconType="refresh" size="s" onClick={onClear}>
                    Update preview
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />

              <div style={{ minHeight: '300px' }}>
                {isLoadingPreview ? (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <EuiLoadingSpinner size="xl" />
                  </div>
                ) : (
                  <EnhancedPreviewComponent
                    previewData={filePreviewData.documents || []}
                    predictedMapping={filePreviewData.predictedMapping || {}}
                    existingMapping={filePreviewData.existingMapping || {}}
                  />
                )}
              </div>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPageContent>
  );
};
