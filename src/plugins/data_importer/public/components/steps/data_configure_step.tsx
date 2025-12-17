/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import uuid from 'uuid';
import {
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

  // Operations and Actions
  actions: {
    setTimeField: (field: string) => void;
    setGroqInput: (text: string) => void;
  };
  dataOperations: {
    importData: (fetchIndices: () => Promise<void>) => Promise<void>;
  };

  // Navigation callbacks
  onBackToUpload: () => void;
  onClear: () => void;
  onUpdatePreview: () => void;

  // Validation
  canProceedToStep3: boolean;
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
  actions,
  dataOperations,
  onBackToUpload,
  onClear,
  onUpdatePreview,
  canProceedToStep3,
}) => {
  const [isGroqInfoOpen, setIsGroqInfoOpen] = useState<boolean>(false);

  // Internal handlers
  const handleTimeFieldChange = useCallback(
    (selected: Array<{ label: string }>) => {
      actions.setTimeField(selected[0]?.label || '');
    },
    [actions]
  );

  const handleImport = useCallback(() => {
    // Create a simple fetchIndices function for the import operation
    const fetchIndices = async () => {
      // This is handled automatically by the useEffect in useDataSourceManagement
      // No need to do anything here as indices are already being fetched
    };
    dataOperations.importData(fetchIndices);
  }, [dataOperations]);

  return (
    <div>
      <EuiFlexGroup>
        {/* Left Panel - Configuration Sections */}
        <EuiFlexItem grow={1} style={{ maxWidth: '400px' }}>
          {/* Combined Data Configuration and Formatting Panel */}
          <EuiPanel style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: '1 1 auto', overflow: 'auto', paddingRight: '8px', minHeight: 0 }}>
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
                  onChange={handleTimeFieldChange}
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
                              <strong>GROQ</strong> (Graph-Relational Object Queries) is a powerful
                              query language for filtering and transforming your data before
                              indexing.
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
                              <strong>Basic Query Syntax:</strong>
                            </p>
                            <ul>
                              <li>
                                <code>*[filter]</code> - Filter documents
                              </li>
                              <li>
                                <code>*&#123;projection&#125;</code> - Select specific fields
                              </li>
                              <li>
                                <code>*[filter]&#123;projection&#125;</code> - Combine both
                              </li>
                            </ul>

                            <p>
                              <strong>Common Filter Examples:</strong>
                            </p>
                            <ul>
                              <li>
                                <code>*[level == "ERROR"]</code> - Exact match
                              </li>
                              <li>
                                <code>*[statusCode &gt;= 500]</code> - Numeric comparison
                              </li>
                              <li>
                                <code>*[responseTime &gt; 1000]</code> - Greater than
                              </li>
                              <li>
                                <code>*[errorCode != null]</code> - Not null check
                              </li>
                              <li>
                                <code>*[service match "*payment*"]</code> - Pattern matching
                              </li>
                            </ul>

                            <p>
                              <strong>Combining Conditions:</strong>
                            </p>
                            <ul>
                              <li>
                                <code>*[level == "ERROR" && service == "api-gateway"]</code> - AND
                                operator
                              </li>
                              <li>
                                <code>*[statusCode &gt;= 400 || responseTime &gt; 2000]</code> - OR
                                operator
                              </li>
                              <li>
                                <code>*[region == "us-east-1" && level == "ERROR"]</code> - Multiple
                                conditions
                              </li>
                            </ul>

                            <p>
                              <strong>Field Projection Examples:</strong>
                            </p>
                            <ul>
                              <li>
                                <code>*[level == "ERROR"]&#123;timestamp, message&#125;</code> -
                                Select specific fields
                              </li>
                              <li>
                                <code>
                                  *[statusCode &gt;= 500]&#123;service, endpoint, statusCode&#125;
                                </code>{' '}
                                - Multiple fields
                              </li>
                              <li>
                                <code>*&#123;logId, timestamp, level, message&#125;</code> - All
                                documents, selected fields
                              </li>
                            </ul>

                            <p>
                              <strong>Pattern Matching:</strong>
                            </p>
                            <ul>
                              <li>
                                <code>*[message match "*timeout*"]</code> - Contains "timeout"
                              </li>
                              <li>
                                <code>*[endpoint match "/api/*"]</code> - Starts with "/api/"
                              </li>
                              <li>
                                <code>*[message match "*failed"]</code> - Ends with "failed"
                              </li>
                            </ul>

                            <p>
                              <strong>Real-World Use Cases:</strong>
                            </p>
                            <ul>
                              <li>
                                <strong>Error Monitoring:</strong>{' '}
                                <code>*[level == "ERROR" && service == "payment-service"]</code>
                              </li>
                              <li>
                                <strong>Performance Issues:</strong>{' '}
                                <code>
                                  *[responseTime &gt; 1000]&#123;service, endpoint,
                                  responseTime&#125;
                                </code>
                              </li>
                              <li>
                                <strong>Security Audit:</strong>{' '}
                                <code>
                                  *[statusCode == 401]&#123;timestamp, userId, endpoint&#125;
                                </code>
                              </li>
                              <li>
                                <strong>Regional Analysis:</strong>{' '}
                                <code>*[region match "us-*" && statusCode &gt;= 500]</code>
                              </li>
                            </ul>

                            <p>
                              <strong>Supported Operators:</strong>
                            </p>
                            <ul>
                              <li>
                                <code>==</code> - Equal to
                              </li>
                              <li>
                                <code>!=</code> - Not equal to
                              </li>
                              <li>
                                <code>&gt;</code> - Greater than
                              </li>
                              <li>
                                <code>&lt;</code> - Less than
                              </li>
                              <li>
                                <code>&gt;=</code> - Greater than or equal
                              </li>
                              <li>
                                <code>&lt;=</code> - Less than or equal
                              </li>
                              <li>
                                <code>&&</code> - Logical AND
                              </li>
                              <li>
                                <code>||</code> - Logical OR
                              </li>
                              <li>
                                <code>match</code> - Pattern matching (supports * wildcard)
                              </li>
                            </ul>

                            <p>
                              <strong>Tips:</strong>
                            </p>
                            <ul>
                              <li>🔍 Use the preview to test your queries before importing</li>
                              <li>📝 Field names are case-sensitive</li>
                              <li>💡 Use projections to reduce indexed data size</li>
                              <li>⚡ Simple filters are faster than complex ones</li>
                              <li>🎯 Combine filters to narrow results efficiently</li>
                            </ul>

                            <p>
                              <em>
                                Note: GROQ queries run on the parsed JSON structure of your data.
                                Reserved OpenSearch fields like <code>_id</code> and{' '}
                                <code>_type</code> are automatically managed and should not be
                                included in your data.
                              </em>
                            </p>

                            <p>
                              <strong>Need Help?</strong> Start with simple queries like{' '}
                              <code>*[level == "ERROR"]</code>
                              and gradually add more conditions as needed.
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
                    onChange={actions.setGroqInput}
                    width={'100%'}
                    height="120px"
                    value={groqInput || ''}
                    mode="text"
                  />
                </div>
              </EuiFormRow>
            </div>

            {/* Action Buttons - Pinned to bottom */}
            <div>
              <EuiSpacer size="s" />
              {/* Update preview and Back buttons row */}
              <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton iconType="refresh" size="s" onClick={onUpdatePreview}>
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
                onClick={handleImport}
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
                <EuiButton iconType="refresh" size="s" onClick={onUpdatePreview}>
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
  );
};
