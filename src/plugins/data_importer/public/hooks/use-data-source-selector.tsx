/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import { CoreStart } from '../../../../core/public';
import {
  DataSourceManagementPluginSetup,
  DataSourceOption,
} from '../../../data_source_management/public';

interface UseDataSourceSelectorProps {
  dataSourceEnabled: boolean;
  hideLocalCluster: boolean;
  dataSourceManagement?: DataSourceManagementPluginSetup;
  savedObjects: CoreStart['savedObjects'];
  notifications: CoreStart['notifications'];
  dataSourceId?: string;
  dataSourceName?: string;
  actions: {
    setDataSourceId: (id: string | undefined) => void;
    setDataSourceName: (name: string) => void;
  };
}

export const useDataSourceSelector = ({
  dataSourceEnabled,
  hideLocalCluster,
  dataSourceManagement,
  savedObjects,
  notifications,
  dataSourceId,
  dataSourceName,
  actions,
}: UseDataSourceSelectorProps) => {
  // Data source selection handler
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

  // Helper function to validate if we have a proper data source selection
  const hasValidDataSourceSelection = useCallback(() => {
    // Must have a data source name (indicates user made a selection or auto-selected)
    if (!dataSourceName) {
      return false;
    }

    // For enabled data sources, we need either:
    // 1. A remote data source (has dataSourceId)
    // 2. Local cluster selection (dataSourceName but no dataSourceId)
    if (dataSourceEnabled) {
      // Remote data source selected
      if (dataSourceId) {
        return true;
      }
      // Local cluster selected (name contains 'local' and no dataSourceId)
      if (!dataSourceId && dataSourceName.toLowerCase().includes('local')) {
        return true;
      }
      return false;
    } else {
      // Data sources disabled, should be using local cluster
      return dataSourceName.toLowerCase().includes('local');
    }
  }, [dataSourceId, dataSourceName, dataSourceEnabled]);

  // Auto-select local cluster when data sources are disabled
  useEffect(() => {
    if (!dataSourceEnabled && !dataSourceName) {
      actions.setDataSourceName('Local Cluster');
    }
  }, [dataSourceEnabled, dataSourceName, actions]);

  // Render data source component
  const renderDataSourceComponent = useMemo(() => {
    if (!dataSourceEnabled || !dataSourceManagement) return null;

    const DataSourceSelector = dataSourceManagement!.ui.DataSourceSelector as React.ComponentType<
      any
    >;
    return (
      <div className="devAppDataSourceSelector">
        <DataSourceSelector
          savedObjectsClient={savedObjects.client}
          notifications={notifications.toasts}
          onSelectedDataSource={onDataSourceSelect}
          disabled={!dataSourceEnabled}
          fullWidth={false}
          compressed={false}
          hideLocalCluster={hideLocalCluster}
        />
      </div>
    );
  }, [
    dataSourceManagement,
    savedObjects.client,
    notifications,
    onDataSourceSelect,
    dataSourceEnabled,
    hideLocalCluster,
  ]);

  return {
    onDataSourceSelect,
    hasValidDataSourceSelection,
    renderDataSourceComponent,
  };
};