/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { PreviewResponse } from '../types';
import { CSV_SUPPORTED_DELIMITERS } from '../../common/constants';
import { PublicConfigSchema } from '../../config';

interface ImportStats {
  totalDocs: number;
  indexSize: string;
  timestamp: string;
}

interface ImportError {
  error: string;
  line?: number;
  message: string;
}

export interface DataImporterState {
  // Step management
  currentStep: 1 | 2 | 3;

  // Step 1 state - Data source and file selection
  indexName: string;
  inputFile: File | undefined;
  textInput: string;
  textFileType: string;
  dataSourceId: string | undefined;
  dataSourceName: string;
  indexOptions: Array<{ label: string }>;
  createMode: boolean;
  groqInput: string;
  delimiter: string;
  showDelimiterChoice: boolean;

  // Step 2 state - Data configuration and preview
  filePreviewData: PreviewResponse;
  timeField: string;
  availableTimeFields: string[];
  isLoadingPreview: boolean;

  // Step 3 state - Import results
  isImporting: boolean;
  importStats: ImportStats | null;
  importErrors: ImportError[];
}

export interface DataImporterActions {
  // Step management
  setCurrentStep: (step: 1 | 2 | 3) => void;

  // Step 1 actions
  setIndexName: (name: string) => void;
  setInputFile: (file: File | undefined) => void;
  setTextInput: (text: string) => void;
  setTextFileType: (type: string) => void;
  setDataSourceId: (id: string | undefined) => void;
  setDataSourceName: (name: string) => void;
  setIndexOptions: (options: Array<{ label: string }>) => void;
  setCreateMode: (mode: boolean) => void;
  setGroqInput: (input: string) => void;
  setDelimiter: (delimiter: string) => void;
  setShowDelimiterChoice: (show: boolean) => void;

  // Step 2 actions
  setFilePreviewData: (data: PreviewResponse) => void;
  setTimeField: (field: string) => void;
  setAvailableTimeFields: (fields: string[]) => void;
  setIsLoadingPreview: (loading: boolean) => void;

  // Step 3 actions
  setIsImporting: (importing: boolean) => void;
  setImportStats: (stats: ImportStats | null) => void;
  setImportErrors: (errors: ImportError[]) => void;

  // Utility actions
  resetWorkflow: () => void;
}

export const useDataImporterState = (config: PublicConfigSchema) => {
  // Step management
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1 state - Data source and file selection
  const [indexName, setIndexName] = useState<string>('');
  const [inputFile, setInputFile] = useState<File | undefined>();
  const [textInput, setTextInput] = useState<string>('');
  const [textFileType, setTextFileType] = useState<string>(
    config.enabledFileTypes.length > 0 ? config.enabledFileTypes[0] : 'json'
  );
  const [dataSourceId, setDataSourceId] = useState<string | undefined>();
  const [dataSourceName, setDataSourceName] = useState<string>('');
  const [indexOptions, setIndexOptions] = useState<Array<{ label: string }>>([]);
  const [createMode, setCreateMode] = useState<boolean>(false);
  const [groqInput, setGroqInput] = useState<string>('');
  const [delimiter, setDelimiter] = useState<string>(CSV_SUPPORTED_DELIMITERS[0]);
  const [showDelimiterChoice, setShowDelimiterChoice] = useState<boolean>(false);

  // Step 2 state - Data configuration and preview
  const [filePreviewData, setFilePreviewData] = useState<PreviewResponse>({
    documents: [],
    predictedMapping: {},
  });
  const [timeField, setTimeField] = useState<string>('');
  const [availableTimeFields, setAvailableTimeFields] = useState<string[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  // Step 3 state - Import results
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);

  const resetWorkflow = () => {
    setCurrentStep(1);
    setInputFile(undefined);
    setTextInput('');
    setTextFileType(config.enabledFileTypes.length > 0 ? config.enabledFileTypes[0] : 'json');
    setGroqInput('');
    setIndexName('');
    setDataSourceName('');
    setDelimiter(CSV_SUPPORTED_DELIMITERS[0]);
    setShowDelimiterChoice(false);
    setFilePreviewData({ documents: [], predictedMapping: {} });
    setImportStats(null);
    setImportErrors([]);
    setTimeField('');
    setAvailableTimeFields([]);
  };

  const state: DataImporterState = {
    // Step management
    currentStep,

    // Step 1 state
    indexName,
    inputFile,
    textInput,
    textFileType,
    dataSourceId,
    dataSourceName,
    indexOptions,
    createMode,
    groqInput,
    delimiter,
    showDelimiterChoice,

    // Step 2 state
    filePreviewData,
    timeField,
    availableTimeFields,
    isLoadingPreview,

    // Step 3 state
    isImporting,
    importStats,
    importErrors,
  };

  const actions: DataImporterActions = {
    // Step management
    setCurrentStep,

    // Step 1 actions
    setIndexName,
    setInputFile,
    setTextInput,
    setTextFileType,
    setDataSourceId,
    setDataSourceName,
    setIndexOptions,
    setCreateMode,
    setGroqInput,
    setDelimiter,
    setShowDelimiterChoice,

    // Step 2 actions
    setFilePreviewData,
    setTimeField,
    setAvailableTimeFields,
    setIsLoadingPreview,

    // Step 3 actions
    setIsImporting,
    setImportStats,
    setImportErrors,

    // Utility actions
    resetWorkflow,
  };

  return { state, actions };
};