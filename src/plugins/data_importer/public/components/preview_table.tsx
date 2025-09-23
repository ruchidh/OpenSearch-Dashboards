/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { EuiText, EuiDataGrid, EuiButton, EuiFieldSearch, EuiIcon, EuiToolTip } from '@elastic/eui';
import './preview_table.scss';

interface PreviewComponentProps {
  previewData: Array<Record<string, any>>;
  visibleRows: number;
  loadMoreRows: () => void;
  predictedMapping: Record<string, any>;
  existingMapping: Record<string, any>;
}

export const PreviewComponent = ({
  previewData,
  visibleRows,
  loadMoreRows,
  predictedMapping,
  existingMapping,
}: PreviewComponentProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  previewData = previewData.flat();
  const totalRows = previewData?.length;
  const loadedRows = Math.min(visibleRows, totalRows);

  const filteredData = useMemo(
    () =>
      previewData?.filter((row) =>
        Object.values(row).some(
          (value) =>
            typeof value === 'string' && value.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ),
    [previewData, searchQuery]
  );

  // DataGrid columns
  const columns = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    return Object.keys(filteredData[0]).map((key) => ({
      id: key,
      display: key,
    }));
  }, [filteredData]);

  const getCellStyle = React.useCallback(
    (field: string) => {
      const predictedType = predictedMapping?.properties?.[field]?.type;
      const existingType = existingMapping?.properties?.[field]?.type;
      if (predictedType && existingType && predictedType !== existingType) {
        return { color: '#BD271E' };
      }
      return {};
    },
    [predictedMapping, existingMapping]
  );

  const getTooltipContent = React.useCallback(
    (field: string) => {
      const predictedType = predictedMapping?.properties?.[field]?.type;
      const existingType = existingMapping?.properties?.[field]?.type;
      if (predictedType && existingType && predictedType !== existingType) {
        return `Predicted type: ${predictedType}, Existing type: ${existingType}`;
      }
      return '';
    },
    [predictedMapping, existingMapping]
  );

  // DataGrid cell renderer
  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      const row = filteredData?.[rowIndex];
      if (!row) return null;
      const tooltip = getTooltipContent(columnId);
      return (
        <span style={getCellStyle(columnId)}>
          {row[columnId]}
          {tooltip && (
            <EuiToolTip position="top" content={tooltip}>
              <EuiIcon type="alert" color="danger" style={{ marginLeft: '5px' }} />
            </EuiToolTip>
          )}
        </span>
      );
    };
  }, [filteredData, getCellStyle, getTooltipContent]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <EuiText>
          <h3>
            Preview Data ({loadedRows}/{totalRows})
          </h3>
        </EuiText>
        <EuiFieldSearch
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          isClearable
          className="customSearchBar"
        />
      </div>
      <div style={{ height: '400px', width: '100%' }}>
        <EuiDataGrid
          aria-label="Preview Data Grid"
          columns={columns}
          columnVisibility={{
            visibleColumns: columns.map((c) => c.id),
            setVisibleColumns: () => {},
          }}
          rowCount={filteredData?.length || 0}
          renderCellValue={renderCellValue}
          inMemory={{ level: 'enhancements' }}
          style={{ minHeight: 300 }}
          toolbarVisibility={true}
          pagination={undefined}
        />
        {totalRows === 0 && (
          <EuiText textAlign="center" style={{ marginTop: '20px' }}>
            <p>No data to display. Please upload a file to see the preview.</p>
          </EuiText>
        )}
      </div>
      {loadedRows < totalRows && (
        <EuiButton onClick={loadMoreRows} style={{ marginTop: '20px' }}>
          Click to See More
        </EuiButton>
      )}
    </>
  );
};
