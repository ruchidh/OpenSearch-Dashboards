/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiCallOut,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { MappingConflict } from '../types';

interface MappingConflictsBannerProps {
  conflicts: MappingConflict[];
  onViewConflicts: () => void;
  onClearConflicts: () => void;
}

export const MappingConflictsBanner: React.FC<MappingConflictsBannerProps> = ({
  conflicts,
  onViewConflicts,
  onClearConflicts,
}) => {
  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={i18n.translate('dataImporter.mappingConflicts.title', {
          defaultMessage: 'Conflicts between uploaded data and destination index',
        })}
        color="warning"
        iconType="alert"
      >
        <p>
          {i18n.translate('dataImporter.mappingConflicts.description', {
            defaultMessage: 'Data field types must match between the uploaded data and the destination index. Update the conflicting field types or select another index.',
          })}
        </p>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              color="warning"
              onClick={onViewConflicts}
              size="s"
            >
              {i18n.translate('dataImporter.mappingConflicts.viewConflicts', {
                defaultMessage: 'View conflicts ({count})',
                values: { count: conflicts.length },
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              color="primary"
              onClick={onClearConflicts}
              size="s"
            >
              {i18n.translate('dataImporter.mappingConflicts.clearConflicts', {
                defaultMessage: 'Clear conflicts to reupload',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};