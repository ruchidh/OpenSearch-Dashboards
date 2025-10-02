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
            <EuiPanel style={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1 }}>
                <EuiTitle size="s">
                  <h3>Data Configuration</h3>
                </EuiTitle>
                <EuiSpacer size="m" />

                <EuiFormRow label="Select datasource">
                  <EuiFieldText
                    value={
                      dataSourceName ||
                      (dataSourceEnabled ? 'No data source selected' : 'Local Cluster')
                    }
                    readOnly
                  />
                </EuiFormRow>

                <EuiFormRow label="Select/create index">
                  <EuiFieldText value={indexName} readOnly />
                </EuiFormRow>

                <EuiFormRow label="Select timefield">
                  <EuiComboBox
                    placeholder="Select time field..."
                    singleSelection={{ asPlainText: true }}
                    options={availableTimeFields.map((field) => ({ label: field }))}
                    selectedOptions={timeField ? [{ label: timeField }] : []}
                    onChange={onTimeFieldChange}
                  />
                </EuiFormRow>

                {/* Data Formatting Section - Show only if there's applied formatting */}
                {hasDataFormatting && (
                  <>
                    <EuiSpacer size="l" />
                    <EuiTitle size="s">
                      <h3>Data Formatting</h3>
                    </EuiTitle>
                    <EuiSpacer size="m" />

                    {groqInput && groqInput.trim() && (
                      <EuiFormRow label="Applied GROQ Command">
                        <EuiFieldText value={groqInput} readOnly />
                      </EuiFormRow>
                    )}

                    {showDelimiterChoice && (
                      <EuiFormRow label="Applied Delimiter">
                        <EuiFieldText
                          value={delimiter === '\t' ? 'Tab (\\t)' : delimiter === ',' ? 'Comma (,)' : delimiter === ';' ? 'Semicolon (;)' : delimiter === '|' ? 'Pipe (|)' : delimiter}
                          readOnly
                        />
                      </EuiFormRow>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons - Pinned to bottom */}
              <div style={{ paddingTop: '16px' }}>
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

            {/* Errors Panel - Only show when there are errors */}
            {importErrors.length > 0 && (
              <EuiPanel>
                <EuiTitle size="s">
                  <h3>Errors</h3>
                </EuiTitle>
                <EuiSpacer size="m" />

                <div>
                  {importErrors.map((error, index) => (
                    <EuiCallOut key={index} title={error.error} color="danger" iconType="alert">
                      <p>{error.message}</p>
                    </EuiCallOut>
                  ))}
                </div>
              </EuiPanel>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPageContent>
  );
};