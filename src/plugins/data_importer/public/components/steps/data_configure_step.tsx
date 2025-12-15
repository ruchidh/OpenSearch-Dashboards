/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
  EuiCallOut,
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
  importErrors: Array<{
    error: string;
    line?: number;
    message: string;
  }>;
  isImporting: boolean;
  groqInput?: string;
  delimiter?: string;
  showDelimiterChoice?: boolean;

  // Callbacks
  onBackToUpload: () => void;
  onClear: () => void;
  onImport: () => void;
  onTimeFieldChange: (selected: Array<{ label: string }>) => void;

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
  importErrors,
  isImporting,
  groqInput,
  delimiter,
  showDelimiterChoice,
  onBackToUpload,
  onClear,
  onImport,
  onTimeFieldChange,
  canProceedToStep3,
  renderStepProgress,
}) => {
  // Check if data formatting section should be shown
  const hasDataFormatting = (groqInput && groqInput.trim()) || showDelimiterChoice;
  return (
    <EuiPageContent paddingSize="s">
      <div className="wizard-step-container">
        {renderStepProgress()}

        <EuiTitle size="xs">
          <h3>Step 2: Configure & Preview Data</h3>
        </EuiTitle>

        <EuiFlexGroup>
          {/* Left Panel - Configuration Sections */}
          <EuiFlexItem grow={1} style={{ maxWidth: '400px' }}>
            {/* Combined Data Configuration and Formatting Panel */}
            <EuiPanel style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: '1 1 auto', overflow: 'auto', paddingRight: '8px', minHeight: 0 }}>
                <EuiTitle size="s">
                  <h3>Data Configuration</h3>
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

                <EuiFormRow
                  label="Time field (optional)"
                  helpText="Select a time field for time-based filtering in Discover and Visualizations"
                >
                  <EuiComboBox
                    placeholder="Select time field (optional)..."
                    singleSelection={{ asPlainText: true }}
                    options={availableTimeFields.map((field) => ({ label: field }))}
                    selectedOptions={timeField ? [{ label: timeField }] : []}
                    onChange={onTimeFieldChange}
                    isClearable={true}
                  />
                </EuiFormRow>

                {/* Simplified - removed data formatting section to save space */}
              </div>

              {/* Action Buttons - Pinned to bottom */}
              <div style={{ flex: '0 0 auto', borderTop: '1px solid #D3DAE6', padding: '16px 0' }}>
                {/* Back and Clear buttons row */}
                <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      iconType="arrowLeft"
                      size="s"
                      onClick={onBackToUpload}
                    >
                      Back
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="danger"
                      size="s"
                      onClick={onClear}
                    >
                      Clear
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="m" />

                {/* Full width Import button */}
                <EuiButton
                  fill
                  color="success"
                  size="m"
                  fullWidth={true}
                  onClick={onImport}
                  isLoading={isImporting}
                  isDisabled={true}
                >
                  Import (Resolve conflicts first)
                </EuiButton>
              </div>
            </EuiPanel>
          </EuiFlexItem>

          {/* Right Panel - Preview and Errors */}
          <EuiFlexItem grow={2}>
            {/* Preview Panel */}
            <EuiPanel style={{ marginBottom: '16px' }}>
              <EuiTitle size="s">
                <h3>Preview</h3>
              </EuiTitle>
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

            {/* Errors Panel - Show dummy errors for demo */}
            {(importErrors.length > 0 || true) && (
              <EuiPanel style={{ maxHeight: '40vh', overflow: 'auto' }}>
                <EuiTitle size="s">
                  <h3>Mapping Conflicts & Errors</h3>
                </EuiTitle>
                <EuiSpacer size="m" />

                <div>
                  {/* Real errors if they exist */}
                  {importErrors.map((error, index) => (
                    <EuiCallOut key={index} title={error.error} color="danger" iconType="alert">
                      <p>{error.message}</p>
                    </EuiCallOut>
                  ))}

                  {/* DEMO: Dummy mapping conflict errors */}
                  <EuiCallOut
                    title="Field Type Conflict: amount"
                    color="danger"
                    iconType="alert"
                    style={{ marginBottom: '8px' }}
                  >
                    <p>
                      <strong>Conflict:</strong> Mixed types - number, string, boolean<br/>
                      <strong>Affected:</strong> 3 of 4 documents<br/>
                      <strong>Fix:</strong> Standardize to numeric format
                    </p>
                  </EuiCallOut>

                  <EuiCallOut
                    title="Field Type Conflict: user_id"
                    color="danger"
                    iconType="alert"
                    style={{ marginBottom: '8px' }}
                  >
                    <p>
                      <strong>Conflict:</strong> Expected integer, found string/float/object<br/>
                      <strong>Fix:</strong> Use consistent ID format
                    </p>
                  </EuiCallOut>

                  <EuiCallOut
                    title="Invalid Date: timestamp"
                    color="warning"
                    iconType="alert"
                  >
                    <p>
                      <strong>Issue:</strong> Some values not valid dates<br/>
                      <strong>Fix:</strong> Use ISO format (2024-01-15T10:30:00Z)
                    </p>
                  </EuiCallOut>
                </div>
              </EuiPanel>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPageContent>
  );
};