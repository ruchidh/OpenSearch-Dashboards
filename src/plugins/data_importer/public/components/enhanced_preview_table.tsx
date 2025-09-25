/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiText,
  EuiDataGrid,
  EuiFieldSearch,
  EuiIcon,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

interface EnhancedPreviewComponentProps {
  previewData: Array<Record<string, any>>;
  predictedMapping: Record<string, any>;
  existingMapping: Record<string, any>;
}

export const EnhancedPreviewComponent = ({
  previewData,
  predictedMapping,
  existingMapping,
}: EnhancedPreviewComponentProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [sortingColumns, setSortingColumns] = useState<
    Array<{ id: string; direction: 'asc' | 'desc' }>
  >([]);

  const totalRows = previewData?.length || 0;

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return previewData || [];

    return (
      previewData?.filter((row) =>
        Object.values(row).some(
          (value) =>
            typeof value === 'string' && value.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ) || []
    );
  }, [previewData, searchQuery]);

  // Generate columns for data grid
  const columns = useMemo(() => {
    if (!previewData?.length) return [];

    const dataColumns = Object.keys(previewData[0]).map((field) => ({
      id: field,
      displayAsText: field,
      defaultSortDirection: 'asc' as const,
      isExpandable: false,
      isResizable: true,
      isSortable: true,
    }));

    // Add row number column
    const rowNumberColumn = {
      id: 'rowNumber',
      displayAsText: '#',
      defaultSortDirection: 'asc' as const,
      isExpandable: false,
      isResizable: false,
      isSortable: false,
      initialWidth: 60,
    };

    return [rowNumberColumn, ...dataColumns];
  }, [previewData]);

  // Set visible columns when columns change
  React.useEffect(() => {
    if (columns.length > 0) {
      setVisibleColumns(columns.map((col) => col.id));
    }
  }, [columns]);

  // Check if a field has mapping errors
  const hasFieldError = useCallback(
    (field: string) => {
      return (
        predictedMapping?.properties?.[field]?.type &&
        existingMapping?.properties?.[field]?.type &&
        predictedMapping.properties[field].type !== existingMapping.properties[field].type
      );
    },
    [predictedMapping, existingMapping]
  );

  // Render cell content with error indicators
  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      if (columnId === 'rowNumber') {
        return rowIndex + 1;
      }

      const row = filteredData[rowIndex];
      if (!row) return '';

      const value = row[columnId];
      const hasError = hasFieldError(columnId);

      if (hasError) {
        return (
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <span style={{ color: '#BD271E' }}>{String(value)}</span>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="top"
                content={`Predicted type: ${predictedMapping.properties[columnId].type}, Existing type: ${existingMapping.properties[columnId].type}`}
              >
                <EuiIcon type="alert" color="danger" size="s" />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }

      return String(value);
    },
    [filteredData, hasFieldError, predictedMapping, existingMapping]
  );

  if (totalRows === 0) {
    return (
      <EuiText textAlign="center" color="subdued">
        <p>No data to display. Please upload a file to see the preview.</p>
      </EuiText>
    );
  }

  return (
    <>
      {/* Header with search */}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText>
            <h4>
              Showing {filteredData.length} of {totalRows} rows
            </h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFieldSearch
            placeholder="Search data..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            isClearable
            style={{ width: '300px' }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* Virtualized Data Grid */}
      <div style={{ height: '500px', width: '100%' }}>
        <EuiDataGrid
          aria-label="Data preview grid"
          columns={columns}
          columnVisibility={{
            visibleColumns,
            setVisibleColumns,
          }}
          rowCount={filteredData.length}
          renderCellValue={renderCellValue}
          sorting={{
            columns: sortingColumns,
            onSort: setSortingColumns,
          }}
          height={500}
          gridStyle={{
            border: 'horizontal',
            fontSize: 's',
            cellPadding: 's',
            stripes: true,
          }}
          toolbarVisibility={{
            showColumnSelector: true,
            showSortSelector: true,
            showFullScreenSelector: true,
          }}
          leadingControlColumns={[]}
          trailingControlColumns={[]}
        />
      </div>
    </>
  );
};
