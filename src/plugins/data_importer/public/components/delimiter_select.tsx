/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { CSV_SUPPORTED_DELIMITERS } from '../../common/constants';

export interface DelimiterSelectProps {
  onDelimiterChange: (delimiter: any) => void;
  initialDelimiter?: string;
}

export const DelimiterSelect = ({ onDelimiterChange, initialDelimiter }: DelimiterSelectProps) => {
  return (
    <EuiFormRow
      label={i18n.translate('dataImporter.delimiter', {
        defaultMessage: 'Delimiter options',
      })}
    >
      <EuiSelect
        options={CSV_SUPPORTED_DELIMITERS.map((delimiterCharacter: string) => {
          return { value: delimiterCharacter, text: delimiterCharacter };
        })}
        onChange={onDelimiterChange}
        value={initialDelimiter}
      />
    </EuiFormRow>
  );
};
