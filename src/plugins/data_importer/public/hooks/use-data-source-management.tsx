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
  fetchIndices: () => Promise<void>;
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

  const fetchIndices = useCallback(async () => {
    try {
      const response = await catIndices({ http, dataSourceId: state.dataSourceId });
      actions.setIndexOptions(response.indices.map((index: string) => ({ label: index })));
    } catch (error) {
      // Silently fail for now - user can still create new indices
      console.warn('Could not fetch indices:', error);
      actions.setIndexOptions([]);
    }
  }, [http, state.dataSourceId, actions]);

  const renderDataSourceComponent = useMemo(() => {
    return (
      <div>
        {DataSourceMenuComponent && (
          <>
            <DataSourceMenuComponent
              componentType={'DataSourceSelectable'}
              componentConfig={{
                fullWidth: true,
                savedObjects: savedObjects.client,
                notifications,
                onSelectedDataSources: onDataSourceSelect,
              }}
              onManageDataSource={() => {}}
            />
            <EuiSpacer size="m" />
          </>
        )}
      </div>
    );
  }, [DataSourceMenuComponent, savedObjects.client, notifications, onDataSourceSelect]);

  // Auto-select local cluster if no data sources are configured
  useEffect(() => {
    if (dataSourceEnabled && !state.dataSourceId && !state.dataSourceName) {
      // If local cluster is available (not hidden), auto-select it
      if (!hideLocalCluster) {
        actions.setDataSourceId('local');
        actions.setDataSourceName('Local Cluster');
      }
    }
  }, [dataSourceEnabled, state.dataSourceId, state.dataSourceName, hideLocalCluster, actions]);

  useEffect(() => {
    // Only fetch indices if we have basic requirements
    if (http) {
      fetchIndices();
    }
  }, [http, fetchIndices]);

  return {
    renderDataSourceComponent,
    onDataSourceSelect,
    onIndexNameChange,
    onCreateIndexName,
    fetchIndices,
  };
};
