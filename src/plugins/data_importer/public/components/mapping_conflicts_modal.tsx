/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiBasicTable,
  EuiIcon,
  EuiButtonIcon,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { MappingConflict } from '../types';

interface MappingConflictsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: MappingConflict[];
}

export const MappingConflictsModal: React.FC<MappingConflictsModalProps> = ({
  isOpen,
  onClose,
  conflicts,
}) => {
  if (!isOpen) {
    return null;
  }

  const columns = [
    {
      field: 'fieldName',
      name: i18n.translate('dataImporter.mappingConflicts.modal.fieldName', {
        defaultMessage: 'Field name',
      }),
      width: '30%',
    },
    {
      field: 'uploadedType',
      name: i18n.translate('dataImporter.mappingConflicts.modal.uploadedType', {
        defaultMessage: 'Field type (Uploaded data)',
      }),
      width: '30%',
      render: (uploadedType: string) => (
        <span>
          <EuiIcon type="alert" color="warning" size="s" style={{ marginRight: 8 }} />
          {uploadedType}
        </span>
      ),
    },
    {
      field: 'destinationType',
      name: i18n.translate('dataImporter.mappingConflicts.modal.destinationType', {
        defaultMessage: 'Field type (Destination index)',
      }),
      width: '40%',
    },
  ];

  return (
    <EuiModal onClose={onClose} style={{ width: '800px' }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>
              {i18n.translate('dataImporter.mappingConflicts.modal.title', {
                defaultMessage: 'Field type conflicts ({count})',
                values: { count: conflicts.length },
              })}
            </span>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              aria-label={i18n.translate('dataImporter.mappingConflicts.modal.close', {
                defaultMessage: 'Close',
              })}
              onClick={onClose}
            />
          </div>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiSpacer size="s" />
        <EuiBasicTable<MappingConflict>
          tableLayout="auto"
          items={conflicts}
          columns={columns}
          rowHeader="fieldName"
        />
      </EuiModalBody>
    </EuiModal>
  );
};