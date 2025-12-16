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

  // Helper function to format cell values properly
  const formatCellValue = useCallback((value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      // For arrays, show a compact representation
      if (value.length === 0) {
        return '[]';
      }

      // If array contains only primitives, show them inline
      const allPrimitives = value.every(item =>
        item === null || item === undefined ||
        typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
      );

      if (allPrimitives && value.length <= 3) {
        return `[${value.map(item => item === null ? 'null' : String(item)).join(', ')}]`;
      }

      // For complex arrays or long arrays, show count
      return `Array(${value.length})`;
    }

    if (typeof value === 'object') {
      // For objects, try to show a compact JSON representation if small
      try {
        const jsonStr = JSON.stringify(value);
        if (jsonStr.length <= 50) {
          return jsonStr;
        }

        // For larger objects, show key count
        const keyCount = Object.keys(value).length;
        return `{${keyCount} ${keyCount === 1 ? 'property' : 'properties'}}`;
      } catch {
        return '[Complex Object]';
      }
    }

    return String(value);
  }, []);

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
      const formattedValue = formatCellValue(value);

      if (hasError) {
        return (
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <span style={{ color: '#BD271E' }}>{formattedValue}</span>
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

      // Add tooltip for complex values to show full content
      if (typeof value === 'object' && value !== null) {
        const fullContent = JSON.stringify(value, null, 2);
        return (
          <EuiToolTip
            position="top"
            content={<pre style={{ maxHeight: '200px', overflow: 'auto' }}>{fullContent}</pre>}
          >
            <span>{formattedValue}</span>
          </EuiToolTip>
        );
      }

      return formattedValue;
    },
    [filteredData, hasFieldError, predictedMapping, existingMapping, formatCellValue]
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
            showFullScreenSelector: false,
          }}
          leadingControlColumns={[]}
          trailingControlColumns={[]}
        />
      </div>
    </>
  );
};
