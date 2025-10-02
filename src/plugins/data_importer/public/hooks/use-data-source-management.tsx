/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { CoreStart } from '../../../../core/public';
import {
  DataSourceManagementPluginSetup,
  DataSourceOption,
  DataSourceSelectableConfig,
} from '../../../data_source_management/public';
import { catIndices } from '../lib/cat_indices';
import { DataImporterActions, DataImporterState } from './use-data-importer-state';

interface UseDataSourceManagementProps {
  state: DataImporterState;
  actions: DataImporterActions;
  http: CoreStart['http'];
  savedObjects: CoreStart['savedObjects'];
  notifications: CoreStart['notifications'];
  dataSourceEnabled: boolean;
  hideLocalCluster: boolean;
  dataSourceManagement?: DataSourceManagementPluginSetup;
}

interface UseDataSourceManagementReturn {
  renderDataSourceComponent: React.ReactNode;
  onDataSourceSelect: (newDataSource: DataSourceOption[]) => void;
  onIndexNameChange: (selected: Array<{ label: string }>) => void;
  onCreateIndexName: (createdOption: string) => void;
}

export const useDataSourceManagement = ({
  state,
  actions,
  http,
  savedObjects,
  notifications,
  dataSourceEnabled,
  hideLocalCluster,
  dataSourceManagement,
}: UseDataSourceManagementProps): UseDataSourceManagementReturn => {
  const DataSourceMenuComponent = dataSourceManagement?.ui.getDataSourceMenu<
    DataSourceSelectableConfig
  >();

  const onDataSourceSelect = useCallback(
    (newDataSource: DataSourceOption[]) => {
      if (newDataSource.length > 0) {
        actions.setDataSourceId(newDataSource[0].id);
        actions.setDataSourceName(
          newDataSource[0].label || newDataSource[0].id || 'Selected Data Source'
        );
      } else {
        actions.setDataSourceId(undefined);
        actions.setDataSourceName('');
      }
    },
    [actions]
  );

  const onIndexNameChange = useCallback(
    (selected: Array<{ label: string }>) => {
      if (selected.length) {
        actions.setIndexName(selected[0].label);
        actions.setCreateMode(false);
      } else {
        actions.setIndexName('');
      }
    },
    [actions]
  );

  const onCreateIndexName = useCallback(
    (createdOption: string) => {
      actions.setIndexName(createdOption);
      actions.setCreateMode(true);
    },
    [actions]
  );

  const renderDataSourceComponent = useMemo(() => {
    if (!DataSourceMenuComponent) {
      return null;
    }

    // Determine what should be shown as selected
    let activeOption: DataSourceOption[] | undefined;

    if (state.dataSourceId && state.dataSourceId !== '') {
      // Remote data source is selected
      activeOption = [
        {
          id: state.dataSourceId,
          label: state.dataSourceName || state.dataSourceId,
        },
      ];
    } else if (state.dataSourceName && state.dataSourceName.toLowerCase().includes('local')) {
      // Local cluster is selected
      activeOption = [
        {
          id: '',
          label: state.dataSourceName,
        },
      ];
    }

    return (
      <div>
        <DataSourceMenuComponent
          componentType={'DataSourceSelectable'}
          componentConfig={{
            fullWidth: true,
            savedObjects: savedObjects.client,
            notifications,
            onSelectedDataSources: onDataSourceSelect,
            activeOption: activeOption,
          }}
          onManageDataSource={() => {}}
        />
        <EuiSpacer size="m" />
      </div>
    );
  }, [
    DataSourceMenuComponent,
    savedObjects.client,
    notifications,
    onDataSourceSelect,
    state.dataSourceId,
    state.dataSourceName,
  ]);

  // Auto-select local cluster if no data sources are configured
  useEffect(() => {
    if (dataSourceEnabled && !state.dataSourceId && !state.dataSourceName) {
      // If local cluster is available (not hidden), set it up properly
      if (!hideLocalCluster) {
        // For local cluster, we don't need a dataSourceId - just set the name
        // This indicates local cluster is selected without requiring a saved object
        actions.setDataSourceName('Local Cluster');
      }
    } else if (!dataSourceEnabled && !state.dataSourceName) {
      // If data sources are disabled, we're always using local cluster
      actions.setDataSourceName('Local Cluster');
    }
  }, [dataSourceEnabled, state.dataSourceId, state.dataSourceName, hideLocalCluster, actions]);

  useEffect(() => {
    // Only fetch indices if we have basic requirements and avoid infinite loops
    if (!http) return;

    const doFetchIndices = async () => {
      try {
        console.log('Fetching indices with dataSourceId:', state.dataSourceId);
        // For local cluster, pass undefined as dataSourceId
        const response = await catIndices({
          http,
          dataSourceId: state.dataSourceId, // This will be undefined for local cluster
        });
        console.log('Successfully fetched indices:', response);
        actions.setIndexOptions(response.indices.map((index: string) => ({ label: index })));
      } catch (error) {
        // Log error details for debugging
        console.warn('Could not fetch indices:', {
          error,
          dataSourceId: state.dataSourceId,
          message: error?.message || 'Unknown error',
        });

        // Only show notification for actual data source errors, not local cluster issues
        if (
          state.dataSourceId &&
          (error?.message?.toLowerCase().includes('data source') ||
            error?.message?.toLowerCase().includes('not found'))
        ) {
          notifications.toasts.addWarning(
            'Could not connect to the selected data source. You can still create new indices manually.'
          );
        } else if (!state.dataSourceId) {
          // For local cluster connection issues, show different message
          notifications.toasts.addWarning(
            'Could not fetch indices from local cluster. You can still create new indices manually.'
          );
        }

        actions.setIndexOptions([]);
      }
    };

    doFetchIndices();
  }, [http, state.dataSourceId]);

  return {
    renderDataSourceComponent,
    onDataSourceSelect,
    onIndexNameChange,
    onCreateIndexName,
  };
};
