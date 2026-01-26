/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiDescriptionList,
  EuiButton,
  EuiCallOut,
} from '@elastic/eui';
import { CoreStart } from 'opensearch-dashboards/public';
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
  http: CoreStart['http'];
}

export const DataImportCompleteStep: React.FC<DataImportCompleteStepProps> = ({
  indexName,
  importStats,
  filePreviewData,
  importErrors,
  onRestart,
  http,
}) => {
  // Determine if we're in a workspace
  // Extract workspace ID directly from pathname since basePath includes workspace context
  const workspaceMatch = window.location.pathname.match(/\/w\/([^\/]+)/);
  const currentWorkspaceId = workspaceMatch ? workspaceMatch[1] : '';
  const isInWorkspace = !!currentWorkspaceId;


  const redirectToExplore = () => {
    console.log(currentWorkspaceId, 'currentWorkspaceId');
    if (currentWorkspaceId) {
      // If in workspace and explore is available, navigate to explore/logs
      // Extract server base path (remove workspace part from basePath)
      const serverBasePath = http.basePath.get().replace(/\/w\/[^\/]*/, '');
      const targetUrl = `${window.location.origin}${serverBasePath}/w/${currentWorkspaceId}/app/explore/logs#/`;
      window.location.href = targetUrl;
    }
    // else if (currentWorkspaceId && !exploreEnabled) {
    //   // If in workspace but explore not available, fall back to discover
    //   const targetUrl = `${
    //     window.location.origin
    //   }${http.basePath.get()}/w/${currentWorkspaceId}/app/discover`;
    //   window.location.href = targetUrl;
    // }
    else {
      // If outside workspace, navigate to workspace list
      const targetUrl = `${window.location.origin}${http.basePath.get()}/app/workspace_list#/`;
      window.location.href = targetUrl;
    }
  };
  return (
    <div>
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
                  Import more data
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton fill size="s" onClick={redirectToExplore}>
                  {isInWorkspace ? 'View in Discover Logs' : 'Explore in Workspace'}
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
  );
};
