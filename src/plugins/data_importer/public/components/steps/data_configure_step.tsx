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
  onBackToUpload,
  onClear,
  onImport,
  onTimeFieldChange,
  canProceedToStep3,
  renderStepProgress,
}) => {
  return (
    <EuiPageContent paddingSize="s">
      <div className="wizard-step-container">
        {renderStepProgress()}

        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>Step 2: Configure & Preview Data</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton iconType="arrowLeft" size="s" onClick={onBackToUpload}>
              Back to Upload
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup>
          {/* Left Panel - Configuration */}
          <EuiFlexItem grow={1} style={{ maxWidth: '400px' }}>
            <EuiPanel>
              <EuiTitle size="s">
                <h3>Data configuration</h3>
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

              <EuiSpacer size="m" />

              <EuiTitle size="xs">
                <h4>Data formatting</h4>
              </EuiTitle>

              <EuiSpacer size="l" />

              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  <EuiButton
                    iconType="arrowLeft"
                    size="s"
                    onClick={onBackToUpload}
                  >
                    Back
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton
                    color="danger"
                    size="s"
                    onClick={onClear}
                  >
                    Clear
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton
                    fill
                    color="success"
                    size="s"
                    onClick={onImport}
                    isLoading={isImporting}
                    isDisabled={!canProceedToStep3}
                  >
                    Import
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
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