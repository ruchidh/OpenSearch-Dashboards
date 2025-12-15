/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { extname } from 'path';
import { CSV_FILE_TYPE, TSV_FILE_TYPE } from '../../common/constants';
import { DataImporterActions, DataImporterState } from './use-data-importer-state';

export const useFileHandling = (state: DataImporterState, actions: DataImporterActions) => {
  const updateDelimiterVisibility = useCallback((file?: File, textType?: string) => {
    const isFileCSV = file && extname(file.name) === `.${CSV_FILE_TYPE}`;
    const isFileTSV = file && extname(file.name) === `.${TSV_FILE_TYPE}`;
    const isTextCSV = textType === CSV_FILE_TYPE;
    const isTextTSV = textType === TSV_FILE_TYPE;
    actions.setShowDelimiterChoice(isFileCSV || isFileTSV || isTextCSV || isTextTSV);
  }, [actions]);

  const onFileChange = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      actions.setInputFile(file);
      actions.setTextInput(''); // Clear text input when file is selected
      updateDelimiterVisibility(file, state.textFileType);
    } else {
      actions.setInputFile(undefined);
      updateDelimiterVisibility(undefined, state.textFileType);
    }
  }, [actions, state.textFileType, updateDelimiterVisibility]);

  const onTextInputChange = useCallback((text: string) => {
    actions.setTextInput(text);
    if (text.trim()) {
      actions.setInputFile(undefined); // Clear file when text is entered
    }
  }, [actions]);

  const onTextFileTypeChange = useCallback((fileType: string) => {
    actions.setTextFileType(fileType);
    updateDelimiterVisibility(state.inputFile, fileType);
  }, [actions, state.inputFile, updateDelimiterVisibility]);

  const onDelimiterChange = useCallback((e: any) => {
    actions.setDelimiter(e.target.value);
  }, [actions]);

  return {
    onFileChange,
    onTextInputChange,
    onTextFileTypeChange,
    onDelimiterChange,
    updateDelimiterVisibility,
  };
};