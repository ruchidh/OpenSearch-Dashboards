/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef } from 'react';
import { CoreStart } from '../../../../core/public';
import { catIndices } from '../lib/cat_indices';

interface UseIndexManagementProps {
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
  dataSourceId?: string;
  dataSourceName?: string;
  indexOptions: Array<{ label: string }>;
  hasValidDataSourceSelection: () => boolean;
  actions: {
    setIndexName: (name: string) => void;
    setCreateMode: (mode: boolean) => void;
    setIndexOptions: (options: Array<{ label: string }>) => void;
  };
}

export const useIndexManagement = ({
  http,
  notifications,
  dataSourceId,
  dataSourceName,
  indexOptions,
  hasValidDataSourceSelection,
  actions,
}: UseIndexManagementProps) => {
  // Track the last fetched data source to prevent duplicate calls
  const lastFetchedDataSource = useRef<string | undefined>(undefined);
  const isFetching = useRef<boolean>(false);

  // Index operations handlers
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

  // Fetch indices when data source changes
  useEffect(() => {
    // Only fetch indices when we have a valid data source selection
    if (!hasValidDataSourceSelection()) {
      return; // No proper data source selected, don't fetch
    }

    if (!http) return;

    const currentDataSourceId = dataSourceId || 'local';

    // Skip if already fetching or already fetched this data source
    if (isFetching.current || lastFetchedDataSource.current === currentDataSourceId) {
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
          dataSourceId, // This will be undefined for local cluster
        });
        actions.setIndexOptions(response.indices.map((index: string) => ({ label: index })));
        lastFetchedDataSource.current = currentDataSourceId;
      } catch (error) {
        // Log error details for debugging
        console.warn('Could not fetch indices:', {
          error,
          dataSourceId,
          message: error?.message || 'Unknown error',
        });

        // Only show notification for actual data source errors, not local cluster issues
        if (
          dataSourceId &&
          (error?.message?.toLowerCase().includes('data source') ||
            error?.message?.toLowerCase().includes('not found'))
        ) {
          notifications.toasts.addWarning(
            'Could not connect to the selected data source. You can still create new indices manually.'
          );
        } else if (!dataSourceId) {
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
  }, [http, dataSourceId, dataSourceName, hasValidDataSourceSelection, actions, notifications]);

  return {
    onIndexNameChange,
    onCreateIndexName,
    indexOptions,
  };
};