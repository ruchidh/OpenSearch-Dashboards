/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

import {
  EuiCodeEditor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContentBody,
  EuiSelect,
  EuiText,
  EuiButtonIcon,
  EuiPopover,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import uuid from 'uuid';
import { i18n } from '@osd/i18n';
import { JSON_FILE_TYPE } from '../../common/constants';

export interface ImportTextContentBodyProps {
  onTextChange: (text: string) => void;
  enabledFileTypes: string[];
  onFileTypeChange: (fileType: string) => void;
  characterLimit: number;
  initialFileType: string;
  isTextEditorInfoOpen?: boolean;
  setIsTextEditorInfoOpen?: (isOpen: boolean) => void;
  value?: string; // Add value prop to sync with parent state
}

export const ImportTextContentBody = ({
  onTextChange,
  enabledFileTypes,
  onFileTypeChange,
  characterLimit,
  initialFileType,
  isTextEditorInfoOpen,
  setIsTextEditorInfoOpen,
  value = '',
}: ImportTextContentBodyProps) => {
  const [codeEditorText, setCodeEditorText] = useState<string>(value);
  const [fileType, setFileType] = useState<string>(initialFileType);
  const [numCharacters, setNumCharacters] = useState<number>(value.length);

  // Sync internal state with external value prop
  useEffect(() => {
    setCodeEditorText(value);
    setNumCharacters(value.length);
  }, [value]);
  const options = enabledFileTypes.map((type) => {
    return {
      value: type,
      text: type,
    };
  });

  const onTextUpdate = (text: string) => {
    setCodeEditorText(text);
    onTextChange(text);
    setNumCharacters(text.length);
  };

  const onOptionSelect = (e: any) => {
    setFileType(e.target.value === JSON_FILE_TYPE ? e.target.value : undefined);
    onFileTypeChange(e.target.value);
  };

  return (
    <EuiPageContentBody>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexStart" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
              <EuiText>File Format: </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSelect
                options={options}
                fullWidth={false}
                onChange={onOptionSelect}
                value={initialFileType}
              />
            </EuiFlexItem>
            {setIsTextEditorInfoOpen && (
              <EuiFlexItem grow={false}>
                <EuiPopover
                  button={
                    <EuiButtonIcon
                      iconType="questionInCircle"
                      aria-label="Text editor information"
                      size="s"
                      onClick={() => setIsTextEditorInfoOpen(!isTextEditorInfoOpen)}
                    />
                  }
                  isOpen={isTextEditorInfoOpen}
                  closePopover={() => setIsTextEditorInfoOpen(false)}
                  panelPaddingSize="m"
                  anchorPosition="downLeft"
                >
                  <div style={{ maxWidth: '300px' }}>
                    <EuiTitle size="xs">
                      <h4>Text Editor Information</h4>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiText size="s">
                      <p>
                        <strong>Character Limit:</strong> 1,000,000 characters
                      </p>
                      <p>
                        <strong>Supported Formats:</strong> JSON, CSV, NDJSON, TXT
                      </p>
                      <p>
                        <strong>File Size Equivalent:</strong> ~1MB of text data
                      </p>
                      <p>
                        <strong>Typical Usage:</strong>
                      </p>
                      <ul>
                        <li>Small CSV: ~10,000-50,000 characters</li>
                        <li>Medium JSON: ~100,000-300,000 characters</li>
                        <li>Large dataset: Up to 1,000,000 characters</li>
                      </ul>
                      <p>
                        <em>
                          The editor will show a character counter and highlight when approaching
                          the limit.
                        </em>
                      </p>
                    </EuiText>
                  </div>
                </EuiPopover>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <div
            style={{
              height: '100px',
              border: '1px solid #D3DAE6',
              borderRadius: '6px',
            }}
          >
            <EuiCodeEditor
              id={uuid.v4()}
              onChange={onTextUpdate}
              width={'100%'}
              value={codeEditorText}
              mode={fileType}
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color={numCharacters > characterLimit ? 'danger' : 'default'}>
            {numCharacters}/{characterLimit}{' '}
            {i18n.translate('dataImporter.file.characters', {
              defaultMessage: 'characters',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageContentBody>
  );
};
