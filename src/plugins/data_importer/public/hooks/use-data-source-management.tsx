/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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

  // Track the last fetched data source to prevent duplicate calls
  const lastFetchedDataSource = useRef<string | undefined>(undefined);
  const isFetching = useRef<boolean>(false);

  // Helper function to validate if we have a proper data source selection
  const hasValidDataSourceSelection = useCallback(() => {
    // Must have a data source name (indicates user made a selection or auto-selected)
    if (!state.dataSourceName) {
      return false;
    }

    // For enabled data sources, we need either:
    // 1. A remote data source (has dataSourceId)
    // 2. Local cluster selection (dataSourceName but no dataSourceId)
    if (dataSourceEnabled) {
      // Remote data source selected
      if (state.dataSourceId) {
        return true;
      }
      // Local cluster selected (name contains 'local' and no dataSourceId)
      if (!state.dataSourceId && state.dataSourceName.toLowerCase().includes('local')) {
        return true;
      }
      return false;
    } else {
      // Data sources disabled, should be using local cluster
      return state.dataSourceName.toLowerCase().includes('local');
    }
  }, [state.dataSourceId, state.dataSourceName, dataSourceEnabled]);

  const onDataSourceSelect = useCallback(
    (newDataSource: DataSourceOption[]) => {
      // Reset the fetch cache when data source changes
      lastFetchedDataSource.current = undefined;

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

  // Only auto-select local cluster when data sources are completely disabled
  // Otherwise, let the user make an explicit choice
  useEffect(() => {
    if (!dataSourceEnabled && !state.dataSourceName) {
      // If data sources are disabled, we must use local cluster
      actions.setDataSourceName('Local Cluster');
    }
    // Remove auto-selection for enabled data sources - let user choose explicitly
  }, [dataSourceEnabled]);


  useEffect(() => {
    // Only fetch indices when we have a valid data source selection
    if (!hasValidDataSourceSelection()) {
      return; // No proper data source selected, don't fetch
    }

    if (!http) return;

    const currentDataSourceId = state.dataSourceId || 'local';

    // Skip if already fetching or already fetched this data source
    if (
      isFetching.current ||
      lastFetchedDataSource.current === currentDataSourceId
    ) {
      return;
    }

    // Debounce rapid changes to prevent excessive API calls
    const timeoutId = setTimeout(async () => {
      // Double-check conditions after timeout in case they changed
      if (
        isFetching.current ||
        lastFetchedDataSource.current === currentDataSourceId ||
        !hasValidDataSourceSelection() // Re-validate data source selection
      ) {
        return;
      }

      isFetching.current = true;

      try {
        // For local cluster, pass undefined as dataSourceId
        const response = await catIndices({
          http,
          dataSourceId: state.dataSourceId, // This will be undefined for local cluster
        });
        actions.setIndexOptions(response.indices.map((index: string) => ({ label: index })));
        lastFetchedDataSource.current = currentDataSourceId;
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
      } finally {
        isFetching.current = false;
      }
    }, 300); // 300ms debounce

    // Cleanup timeout if effect runs again before timeout completes
    return () => clearTimeout(timeoutId);
  }, [http, state.dataSourceId, state.dataSourceName, hasValidDataSourceSelection]);

  return {
    renderDataSourceComponent,
    onDataSourceSelect,
    onIndexNameChange,
    onCreateIndexName,
  };
};
