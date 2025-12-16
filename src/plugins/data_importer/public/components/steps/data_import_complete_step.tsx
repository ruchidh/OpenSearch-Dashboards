/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiPageContent,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiDescriptionList,
  EuiButton,
  EuiCallOut,
} from '@elastic/eui';
import { ApplicationStart, CoreStart } from 'opensearch-dashboards/public';
import { getWorkspaceIdFromUrl } from '../../../../../core/public/utils';
import { EnhancedPreviewComponent } from '../enhanced_preview_table';
import { PreviewResponse } from '../../types';

interface DataImportCompleteStepProps {
  // State
  indexName: string;
  importStats: {
    totalDocs: number;
    indexSize: string;
    timestamp: string;
  } | null;
  filePreviewData: PreviewResponse;
  importErrors: Array<{
    error: string;
    line?: number;
    message: string;
  }>;

  // Callbacks
  onRestart: () => void;

  // Services
  application: ApplicationStart;
  http: CoreStart['http'];

  // UI Components
  renderStepProgress: () => React.ReactNode;
}

export const DataImportCompleteStep: React.FC<DataImportCompleteStepProps> = ({
  indexName,
  importStats,
  filePreviewData,
  importErrors,
  onRestart,
  application,
  http,
  renderStepProgress,
}) => {
  const redirectToExplore = () => {
    // Get current workspace ID from URL
    const currentWorkspaceId = getWorkspaceIdFromUrl(window.location.href, http.basePath.get());

    if (currentWorkspaceId) {
      // If in workspace, navigate to explore/logs within that workspace
      const targetUrl = `${
        window.location.origin
      }${http.basePath.get()}/w/${currentWorkspaceId}/app/explore/logs#/`;
      window.location.href = targetUrl;
    } else {
      // If outside workspace (like from Data Administration), navigate to standard Discover
      const targetUrl = `${window.location.origin}${http.basePath.get()}/app/discover`;
      window.location.href = targetUrl;
    }
  };
  return (
    <EuiPageContent paddingSize="s">
      <div className="wizard-step-container">
        {renderStepProgress()}

        <EuiSpacer size="m" />

        <EuiFlexGroup>
          {/* Left Panel - Import Details */}
          <EuiFlexItem grow={1} style={{ maxWidth: '400px' }}>
            <EuiPanel>
              <EuiTitle size="s">
                <h3>Import details</h3>
              </EuiTitle>
              <EuiSpacer size="m" />

              {importStats && (
                <EuiDescriptionList
                  listItems={[
                    {
                      title: 'Index Name',
                      description: indexName,
                    },
                    {
                      title: 'Documents Imported',
                      description: importStats.totalDocs.toLocaleString(),
                    },
                    {
                      title: 'File Size',
                      description: importStats.indexSize,
                    },
                    {
                      title: 'Completed At',
                      description: importStats.timestamp,
                    },
                  ]}
                  type="column"
                />
              )}

              <EuiSpacer size="m" />

              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiButton color="success" size="s" onClick={onRestart}>
                    Restart
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton fill size="s" onClick={redirectToExplore}>
                    Explore in Discover
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>

          {/* Right Panel - Preview and Errors */}
          <EuiFlexItem grow={2}>
            {/* Preview Panel */}
            <EuiPanel>
              <EuiTitle size="s">
                <h3>Preview</h3>
              </EuiTitle>
              <EuiSpacer size="m" />

              <div style={{ minHeight: '300px' }}>
                <EnhancedPreviewComponent
                  previewData={filePreviewData.documents || []}
                  predictedMapping={filePreviewData.predictedMapping || {}}
                  existingMapping={filePreviewData.existingMapping || {}}
                />
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
                      {error.line && <p>Line: {error.line}</p>}
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
