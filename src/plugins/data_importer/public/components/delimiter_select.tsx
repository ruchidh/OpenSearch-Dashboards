/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { i18n } from '@osd/i18n';
import {
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiPopover,
  EuiTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { CSV_SUPPORTED_DELIMITERS } from '../../common/constants';

export interface DelimiterSelectProps {
  onDelimiterChange: (delimiter: any) => void;
  initialDelimiter?: string;
}

export const DelimiterSelect = ({ onDelimiterChange, initialDelimiter }: DelimiterSelectProps) => {
  const [isDelimiterInfoOpen, setIsDelimiterInfoOpen] = useState<boolean>(false);

  return (
    <EuiFormRow
      label={
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            {i18n.translate('dataImporter.delimiter', {
              defaultMessage: 'Delimiter options',
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButtonIcon
                  iconType="questionInCircle"
                  aria-label="Delimiter information"
                  size="s"
                  onClick={() => setIsDelimiterInfoOpen(!isDelimiterInfoOpen)}
                />
              }
              isOpen={isDelimiterInfoOpen}
              closePopover={() => setIsDelimiterInfoOpen(false)}
              panelPaddingSize="m"
              anchorPosition="downLeft"
            >
              <div style={{ maxWidth: '320px' }}>
                <EuiTitle size="xs">
                  <h4>Delimiter Information</h4>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <p>
                    <strong>Delimiters</strong> separate columns in CSV/TSV files. Choose the character
                    that separates your data columns.
                  </p>

                  <p><strong>Available Options:</strong></p>
                  <ul>
                    <li><code>,</code> (comma) - Standard CSV format</li>
                    <li><code>;</code> (semicolon) - European CSV format</li>
                    <li><code>	</code> (tab) - TSV format, good for data with commas</li>
                    <li><code>|</code> (pipe) - Alternative delimiter</li>
                  </ul>

                  <p><strong>When to Use:</strong></p>
                  <ul>
                    <li>✅ CSV and TSV files (uploaded or text input)</li>
                    <li>❌ JSON, XML, YAML files (not applicable)</li>
                  </ul>

                  <p><strong>How It Works:</strong></p>
                  <ul>
                    <li>File upload: Auto-detects from file extension</li>
                    <li>Text editor: Shows when CSV/TSV format selected</li>
                    <li>Applies to both preview and import operations</li>
                  </ul>

                  <p><em>Choose the delimiter that matches your data format for proper column separation.</em></p>
                </EuiText>
              </div>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiSelect
        options={CSV_SUPPORTED_DELIMITERS.map((delimiterCharacter: string) => {
          // Provide better display text for special characters
          let displayText = delimiterCharacter;
          if (delimiterCharacter === '\t') {
            displayText = 'Tab (\\t)';
          } else if (delimiterCharacter === ',') {
            displayText = 'Comma (,)';
          } else if (delimiterCharacter === ';') {
            displayText = 'Semicolon (;)';
          } else if (delimiterCharacter === '|') {
            displayText = 'Pipe (|)';
          }

          return { value: delimiterCharacter, text: displayText };
        })}
        onChange={onDelimiterChange}
        value={initialDelimiter}
      />
    </EuiFormRow>
  );
};
