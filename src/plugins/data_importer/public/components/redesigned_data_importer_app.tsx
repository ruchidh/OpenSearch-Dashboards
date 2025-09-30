/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { i18n } from '@osd/i18n';
import { FormattedMessage, I18nProvider } from '@osd/i18n/react';
import { BrowserRouter as Router } from 'react-router-dom';
import {
  EuiButton,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiComboBox,
  EuiFormRow,
  EuiPanel,
  EuiStat,
  EuiProgress,
  EuiTextArea,
  EuiFieldText,
  EuiText,
  EuiFilePicker,
  EuiCallOut,
  EuiHorizontalRule,
  EuiTabs,
  EuiTab,
  EuiIcon,
  EuiToolTip,
  EuiPopover,
  EuiPopoverTitle,
  EuiEmptyPrompt,
  EuiCard,
  EuiButtonEmpty,
  EuiSteps,
  EuiStepsHorizontal,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiSwitch,
  EuiCheckbox,
  EuiRadioGroup,
  EuiDescriptionList,
} from '@elastic/eui';
import { extname } from 'path';
import {
  DataSourceManagementPluginSetup,
  DataSourceOption,
  DataSourceSelectableConfig,
} from '../../../data_source_management/public';
import { CoreStart } from '../../../../core/public';
import { NavigationPublicPluginStart } from '../../../navigation/public';
import { PLUGIN_ID } from '../../common';
import { importFile } from '../lib/import_file';
import { ImportResponse, PreviewResponse } from '../types';
import { PublicConfigSchema } from '../../config';
import { CSV_FILE_TYPE, CSV_SUPPORTED_DELIMITERS } from '../../common/constants';
import { previewFile } from '../lib/preview_file';
import { EnhancedPreviewComponent } from './enhanced_preview_table';
import { catIndices } from '../lib/cat_indices';
import { ImportTextContentBody } from './import_text_content';
import './redesigned_data_importer.scss';

interface RedesignedDataImporterPluginAppProps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  savedObjects: CoreStart['savedObjects'];
  navigation: NavigationPublicPluginStart;
  config: PublicConfigSchema;
  hideLocalCluster: boolean;
  dataSourceEnabled: boolean;
  dataSourceManagement?: DataSourceManagementPluginSetup;
}

export const RedesignedDataImporterPluginApp = ({
  basename,
  notifications,
  http,
  navigation,
  config,
  savedObjects,
  dataSourceEnabled,
  hideLocalCluster,
  dataSourceManagement,
}: RedesignedDataImporterPluginAppProps) => {
  const DataSourceMenuComponent = dataSourceManagement?.ui.getDataSourceMenu<
    DataSourceSelectableConfig
  >();

  // Wizard step management - simplified to 3 steps as per mockup
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1 state - Data source and file selection
  const [indexName, setIndexName] = useState<string>('');
  const [inputFile, setInputFile] = useState<File | undefined>();
  const [textInput, setTextInput] = useState<string>('');
  const [textFileType, setTextFileType] = useState<string>('json');
  const [dataSourceId, setDataSourceId] = useState<string | undefined>();
  const [dataSourceName, setDataSourceName] = useState<string>('');
  const [indexOptions, setIndexOptions] = useState<Array<{ label: string }>>([]);
  const [createMode, setCreateMode] = useState<boolean>(false);
  const [groqInput, setGroqInput] = useState<string>('');

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
  const [importStats, setImportStats] = useState<{
    totalDocs: number;
    indexSize: string;
    timestamp: string;
  } | null>(null);
  const [importErrors, setImportErrors] = useState<
    Array<{
      error: string;
      line?: number;
      message: string;
    }>
  >([]);

  // UI state for text editor info popover
  const [isTextEditorInfoOpen, setIsTextEditorInfoOpen] = useState<boolean>(false);

  // Event handlers
  const onDataSourceSelect = (newDataSource: DataSourceOption[]) => {
    if (newDataSource.length > 0) {
      setDataSourceId(newDataSource[0].id);
      setDataSourceName(newDataSource[0].label || newDataSource[0].id || 'Selected Data Source');
    } else {
      setDataSourceId(undefined);
      setDataSourceName('');
    }
  };

  const onIndexNameChange = (selected: Array<{ label: string }>) => {
    if (selected.length) {
      setIndexName(selected[0].label);
      setCreateMode(false);
    } else {
      setIndexName('');
    }
  };

  const onCreateIndexName = (createdOption: string) => {
    setIndexName(createdOption);
    setCreateMode(true);
  };

  const onFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      setInputFile(file);
      setTextInput(''); // Clear text input when file is selected
    } else {
      setInputFile(undefined);
    }
  };

  const onTextInputChange = (text: string) => {
    setTextInput(text);
    if (text.trim()) {
      setInputFile(undefined); // Clear file when text is entered
    }
  };

  const onTextFileTypeChange = (fileType: string) => {
    setTextFileType(fileType);
  };

  const previewData = async () => {
    if ((!inputFile && !textInput.trim()) || !indexName) return;

    setIsLoadingPreview(true);

    try {
      let response: PreviewResponse | undefined;

      if (inputFile) {
        const fileExtension = extname(inputFile.name);
        response = await previewFile({
          http,
          file: inputFile,
          createMode,
          fileExtension,
          indexName,
          previewCount: config.filePreviewDocumentsCount,
          delimiter: CSV_SUPPORTED_DELIMITERS[0],
          selectedDataSourceId: dataSourceId,
        });
      } else if (textInput.trim()) {
        // Create a virtual file from text input based on selected file type
        const getFileExtension = (fileType: string) => {
          switch (fileType) {
            case 'json':
              return '.json';
            case 'csv':
              return '.csv';
            case 'ndjson':
              return '.ndjson';
            case 'txt':
              return '.txt';
            default:
              return '.json';
          }
        };

        const getMimeType = (fileType: string) => {
          switch (fileType) {
            case 'json':
              return 'application/json';
            case 'csv':
              return 'text/csv';
            case 'ndjson':
              return 'application/x-ndjson';
            case 'txt':
              return 'text/plain';
            default:
              return 'application/json';
          }
        };

        const fileExtension = getFileExtension(textFileType);
        const mimeType = getMimeType(textFileType);

        const blob = new Blob([textInput], { type: mimeType });
        const file = new File([blob], `text_input${fileExtension}`, { type: mimeType });

        response = await previewFile({
          http,
          file,
          createMode,
          fileExtension,
          indexName,
          previewCount: config.filePreviewDocumentsCount,
          delimiter: CSV_SUPPORTED_DELIMITERS[0],
          selectedDataSourceId: dataSourceId,
        });
      }

      if (response) {
        setFilePreviewData(response);

        // Extract available time fields
        const timeFieldCandidates = Object.keys(response.predictedMapping || {}).filter(
          (field) => response.predictedMapping?.[field]?.type === 'date'
        );
        setAvailableTimeFields(timeFieldCandidates);
        if (timeFieldCandidates.length > 0) {
          setTimeField(timeFieldCandidates[0]);
        }

        notifications.toasts.addSuccess(
          i18n.translate('dataImporter.previewSuccess', {
            defaultMessage: 'Preview successful - {count} documents loaded',
            values: { count: response.documents.length },
          })
        );

        // Automatically proceed to Step 2 after successful preview
        setCurrentStep(2);
      }
    } catch (error) {
      const errorMessage = error.body?.message ?? error;
      notifications.toasts.addDanger(
        i18n.translate('dataImporter.previewError', {
          defaultMessage: 'Preview failed: {errorMessage}',
          values: { errorMessage },
        })
      );
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const importData = async () => {
    if ((!inputFile && !textInput.trim()) || !indexName) return;

    setIsImporting(true);
    setImportErrors([]);

    try {
      let response: ImportResponse | undefined;

      if (inputFile) {
        response = await importFile({
          http,
          file: inputFile,
          indexName,
          createMode,
          fileExtension: extname(inputFile.name),
          delimiter: CSV_SUPPORTED_DELIMITERS[0],
          selectedDataSourceId: dataSourceId,
          mapping: filePreviewData.predictedMapping,
        });
      } else if (textInput.trim()) {
        // Create a virtual file from text input based on selected file type
        const getFileExtension = (fileType: string) => {
          switch (fileType) {
            case 'json':
              return '.json';
            case 'csv':
              return '.csv';
            case 'ndjson':
              return '.ndjson';
            case 'txt':
              return '.txt';
            default:
              return '.json';
          }
        };

        const getMimeType = (fileType: string) => {
          switch (fileType) {
            case 'json':
              return 'application/json';
            case 'csv':
              return 'text/csv';
            case 'ndjson':
              return 'application/x-ndjson';
            case 'txt':
              return 'text/plain';
            default:
              return 'application/json';
          }
        };

        const fileExtension = getFileExtension(textFileType);
        const mimeType = getMimeType(textFileType);

        const blob = new Blob([textInput], { type: mimeType });
        const file = new File([blob], `text_input${fileExtension}`, { type: mimeType });

        response = await importFile({
          http,
          file,
          indexName,
          createMode,
          fileExtension,
          delimiter: CSV_SUPPORTED_DELIMITERS[0],
          selectedDataSourceId: dataSourceId,
          mapping: filePreviewData.predictedMapping,
        });
      }

      if (response && response.success) {
        setImportStats({
          totalDocs: response.message.total || filePreviewData.documents.length,
          indexSize: inputFile
            ? `${Math.round(((inputFile.size || 0) / 1024 / 1024) * 100) / 100} MB`
            : `${Math.round((new Blob([textInput]).size / 1024 / 1024) * 100) / 100} MB`,
          timestamp: new Date().toLocaleString(),
        });

        notifications.toasts.addSuccess(
          i18n.translate('dataImporter.dataImported', {
            defaultMessage: '{total} documents successfully imported into {indexName}',
            values: {
              total: response.message.total,
              indexName,
            },
          })
        );

        setCurrentStep(3);
        await fetchIndices();
      }
    } catch (error) {
      const errorMessage = error.body?.message ?? error;
      setImportErrors([
        {
          error: 'Import Error',
          message: errorMessage,
        },
      ]);

      notifications.toasts.addDanger(
        i18n.translate('dataImporter.dataImportError', {
          defaultMessage: 'Data import failed: {errorMessage}',
          values: { errorMessage },
        })
      );
    } finally {
      setIsImporting(false);
    }
  };

  const resetWorkflow = () => {
    setCurrentStep(1);
    setInputFile(undefined);
    setTextInput('');
    setTextFileType('json');
    setGroqInput('');
    setDataSourceName('');
    setFilePreviewData({ documents: [], predictedMapping: {} });
    setImportStats(null);
    setImportErrors([]);
    setTimeField('');
    setAvailableTimeFields([]);
  };

  const fetchIndices = async () => {
    try {
      const response = await catIndices({ http, dataSourceId });
      setIndexOptions(response.indices.map((index: string) => ({ label: index })));
    } catch (error) {
      // Silently fail for now - user can still create new indices
      console.warn('Could not fetch indices:', error);
      setIndexOptions([]);
    }
  };

  // Auto-select local cluster if no data sources are configured
  useEffect(() => {
    if (dataSourceEnabled && !dataSourceId && !dataSourceName) {
      // If local cluster is available (not hidden), auto-select it
      if (!hideLocalCluster) {
        setDataSourceId('local');
        setDataSourceName('Local Cluster');
      }
    }
  }, [dataSourceEnabled, dataSourceId, dataSourceName, hideLocalCluster]);

  useEffect(() => {
    // Only fetch indices if we have basic requirements
    if (http) {
      fetchIndices();
    }
  }, [http, dataSourceId]);

  const renderDataSourceComponent = useMemo(() => {
    return (
      <div>
        {DataSourceMenuComponent && (
          <>
            <DataSourceMenuComponent
              componentType={'DataSourceSelectable'}
              componentConfig={{
                fullWidth: true,
                savedObjects: savedObjects.client,
                notifications,
                onSelectedDataSources: onDataSourceSelect,
              }}
              onManageDataSource={() => {}}
            />
            <EuiSpacer size="m" />
          </>
        )}
      </div>
    );
  }, [dataSourceManagement, savedObjects.client, notifications]);

  // Enable preview when user has index name, data source (if required), and data (file or text)
  const hasValidIndex = Boolean(indexName && indexName.trim());
  const hasValidData = Boolean(inputFile || (textInput && textInput.trim()));
  const hasValidDataSource = !dataSourceEnabled || Boolean(dataSourceId || dataSourceName);
  const canProceedToStep2 = hasValidIndex && hasValidData && hasValidDataSource;
  const canProceedToStep3 = filePreviewData.documents.length > 0;

  // Step progress configuration
  const steps = [
    {
      title: 'Upload Data',
      isComplete: currentStep > 1,
      isActive: currentStep === 1,
    },
    {
      title: 'Configure & Preview',
      isComplete: currentStep > 2,
      isActive: currentStep === 2,
    },
    {
      title: 'Import Complete',
      isComplete: currentStep === 3,
      isActive: currentStep === 3,
    },
  ];

  // Render step progress indicator
  const renderStepProgress = () => (
    <div className="step-progress-container">
      <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="l">
        {steps.map((step, index) => (
          <EuiFlexItem grow={false} key={index}>
            <div className="step-indicator">
              <div
                className={`step-circle ${
                  step.isComplete ? 'completed' : step.isActive ? 'active' : 'inactive'
                }`}
              >
                {step.isComplete ? '✓' : index + 1}
              </div>
              <div className={`step-title ${step.isActive ? 'active' : ''}`}>{step.title}</div>
            </div>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
    </div>
  );

  // Step 1: Empty state - Data source and file selection
  const renderStep1 = () => (
    <EuiPageContent paddingSize="s">
      <div className="wizard-step-container">
        {renderStepProgress()}

        <EuiTitle size="s">
          <p>Step 1: Select Data Source & Upload Data</p>
        </EuiTitle>
        <EuiText color="subdued" size="s">
          <p>
            Choose your data source, target index, and upload your data file or enter text directly.
          </p>
        </EuiText>

        <EuiFlexGroup>
          {/* Left Panel - Configuration */}
          <EuiFlexItem grow={1} style={{ maxWidth: '400px' }}>
            <EuiPanel className={canProceedToStep2 ? 'config-panel active' : 'config-panel'}>
              <EuiTitle size="s">
                <h3>Data Configuration</h3>
              </EuiTitle>
              <EuiSpacer size="m" />

              {/* Data Source Selection - Required */}
              {dataSourceEnabled && (
                <>
                  <EuiFormRow
                    label="Select datasource"
                    isInvalid={!dataSourceId && !dataSourceName}
                    error={!dataSourceId && !dataSourceName ? ['Data source is required'] : []}
                  >
                    {renderDataSourceComponent}
                  </EuiFormRow>
                </>
              )}

              {/* Index Selection */}
              <EuiFormRow label="Select/create index">
                <EuiComboBox
                  placeholder="Enter index name..."
                  singleSelection={{ asPlainText: true }}
                  options={indexOptions}
                  selectedOptions={indexName ? [{ label: indexName }] : []}
                  onChange={onIndexNameChange}
                  onCreateOption={onCreateIndexName}
                />
              </EuiFormRow>

              {/* GROQ Input - Optional */}
              <EuiFormRow
                label="Delimiter/Groq"
                helpText="Optional: Enter GROQ queries or delimiter settings"
              >
                <EuiTextArea
                  value={groqInput}
                  onChange={(e) => setGroqInput(e.target.value)}
                  placeholder="Optional: Enter GROQ queries or delimiter settings..."
                  rows={4}
                  resize="vertical"
                />
              </EuiFormRow>

              <EuiSpacer size="m" />

              <EuiButton
                fill
                size="s"
                color="success"
                isDisabled={!canProceedToStep2}
                onClick={previewData}
              >
                Preview
              </EuiButton>
            </EuiPanel>
          </EuiFlexItem>

          {/* Right Panel - File Upload */}
          <EuiFlexItem grow={2}>
            <EuiPanel
              className={`drag-drop-area ${inputFile || textInput.trim() ? 'has-file' : ''}`}
              style={{ height: '60vh', border: '2px dashed #D3DAE6', width: '100%' }}
            >
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <EuiFilePicker
                    id="filePickerId"
                    initialPromptText="Drop files here or click to upload"
                    onChange={onFileChange}
                    display="large"
                    aria-label="File picker"
                    accept=".csv,.json,.ndjson,.txt,.xml,.har"
                  />
                </div>

                <EuiHorizontalRule margin="m" />
                <EuiText size="s" textAlign="center">
                  <strong>Or</strong>
                </EuiText>
                <EuiSpacer size="s" />

                <div style={{ height: '25vh', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
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
                      anchorPosition="leftCenter"
                    >
                      <div style={{ maxWidth: '300px' }}>
                        <EuiTitle size="xs">
                          <h4>Text Editor Information</h4>
                        </EuiTitle>
                        <EuiSpacer size="s" />
                        <EuiText size="s">
                          <p><strong>Character Limit:</strong> 1,000,000 characters</p>
                          <p><strong>Supported Formats:</strong> JSON, CSV, NDJSON, TXT</p>
                          <p><strong>File Size Equivalent:</strong> ~1MB of text data</p>
                          <p><strong>Typical Usage:</strong></p>
                          <ul>
                            <li>Small CSV: ~10,000-50,000 characters</li>
                            <li>Medium JSON: ~100,000-300,000 characters</li>
                            <li>Large dataset: Up to 1,000,000 characters</li>
                          </ul>
                          <p><em>The editor will show a character counter and highlight when approaching the limit.</em></p>
                        </EuiText>
                      </div>
                    </EuiPopover>
                  </div>
                  <ImportTextContentBody
                    onTextChange={onTextInputChange}
                    enabledFileTypes={['json', 'csv', 'ndjson', 'txt']}
                    onFileTypeChange={onTextFileTypeChange}
                    characterLimit={1000000}
                    initialFileType={textFileType}
                  />
                </div>
              </div>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xl" />
      </div>
    </EuiPageContent>
  );

  // Step 2: Post data load state - Configuration and preview
  const renderStep2 = () => (
    <EuiPageContent paddingSize="s">
      <div className="wizard-step-container">
        {renderStepProgress()}

        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h3>Step 2: Configure & Preview Data</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton iconType="arrowLeft" size="s" onClick={() => setCurrentStep(1)}>
              Back to Upload
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup>
          {/* Left Panel - Configuration */}
          <EuiFlexItem grow={1} style={{ maxWidth: '400px' }}>
            <EuiPanel>
              <EuiTitle size="s">
                <h3>Data configuration</h3>
              </EuiTitle>
              <EuiSpacer size="m" />

              <EuiFormRow label="Select datasource">
                <EuiFieldText
                  value={
                    dataSourceName ||
                    (dataSourceEnabled ? 'No data source selected' : 'Local Cluster')
                  }
                  readOnly
                />
              </EuiFormRow>

              <EuiFormRow label="Select/create index">
                <EuiFieldText value={indexName} readOnly />
              </EuiFormRow>

              <EuiFormRow label="Select timefield">
                <EuiComboBox
                  placeholder="Select time field..."
                  singleSelection={{ asPlainText: true }}
                  options={availableTimeFields.map((field) => ({ label: field }))}
                  selectedOptions={timeField ? [{ label: timeField }] : []}
                  onChange={(selected) => setTimeField(selected[0]?.label || '')}
                />
              </EuiFormRow>

              <EuiSpacer size="m" />

              <EuiTitle size="xs">
                <h4>Data formatting</h4>
              </EuiTitle>

              <EuiSpacer size="l" />

              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiButton
                    color="danger"
                    size="s"
                    onClick={() => {
                      setCurrentStep(1);
                      setFilePreviewData({ documents: [], predictedMapping: {} });
                    }}
                  >
                    Clear
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton
                    fill
                    color="success"
                    size="s"
                    onClick={importData}
                    isLoading={isImporting}
                    isDisabled={!canProceedToStep3}
                  >
                    Import
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>

          {/* Right Panel - Preview and Errors */}
          <EuiFlexItem grow={2}>
            {/* Preview Panel */}
            <EuiPanel style={{ marginBottom: '16px' }}>
              <EuiTitle size="s">
                <h3>Preview</h3>
              </EuiTitle>
              <EuiSpacer size="m" />

              <div style={{ minHeight: '300px' }}>
                {isLoadingPreview ? (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <EuiLoadingSpinner size="xl" />
                  </div>
                ) : (
                  <EnhancedPreviewComponent
                    previewData={filePreviewData.documents || []}
                    predictedMapping={filePreviewData.predictedMapping || {}}
                    existingMapping={filePreviewData.existingMapping || {}}
                  />
                )}
              </div>
            </EuiPanel>

            {/* Errors Panel - Only show when there are errors */}
            {importErrors.length > 0 && (
              <EuiPanel>
                <EuiTitle size="s">
                  <h3>Errors</h3>
                </EuiTitle>
                <EuiSpacer size="m" />

                <div>
                  {importErrors.map((error, index) => (
                    <EuiCallOut key={index} title={error.error} color="danger" iconType="alert">
                      <p>{error.message}</p>
                    </EuiCallOut>
                  ))}
                </div>
              </EuiPanel>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPageContent>
  );

  // Step 3: Post data import - Results and next steps
  const renderStep3 = () => (
    <EuiPageContent paddingSize="s">
      <div className="wizard-step-container">
        {renderStepProgress()}

        <EuiTitle size="m">
          <h3>Step 3: Import Complete</h3>
        </EuiTitle>

        <EuiFlexGroup>
          {/* Left Panel - Import Details */}
          <EuiFlexItem grow={1} style={{ maxWidth: '400px' }}>
            <EuiPanel>
              <EuiTitle size="s">
                <h3>Import details</h3>
              </EuiTitle>
              <EuiSpacer size="m" />

              {importStats && (
                <EuiDescriptionList
                  listItems={[
                    {
                      title: 'Index Name',
                      description: indexName,
                    },
                    {
                      title: 'Documents Imported',
                      description: importStats.totalDocs.toLocaleString(),
                    },
                    {
                      title: 'File Size',
                      description: importStats.indexSize,
                    },
                    {
                      title: 'Completed At',
                      description: importStats.timestamp,
                    },
                  ]}
                  type="column"
                />
              )}

              <EuiSpacer size="l" />

              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiButton color="success" size="s" onClick={resetWorkflow}>
                    Restart
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton
                    fill
                    size="s"
                    href={`#/discover?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(columns:!(_source),filters:!(),index:'${indexName}',interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))`}
                  >
                    Explore in Discover
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>

          {/* Right Panel - Preview and Errors */}
          <EuiFlexItem grow={2}>
            {/* Preview Panel */}
            <EuiPanel style={{ marginBottom: '16px' }}>
              <EuiTitle size="s">
                <h3>Preview</h3>
              </EuiTitle>
              <EuiSpacer size="m" />

              <div style={{ minHeight: '300px' }}>
                <EnhancedPreviewComponent
                  previewData={filePreviewData.documents || []}
                  predictedMapping={filePreviewData.predictedMapping || {}}
                  existingMapping={filePreviewData.existingMapping || {}}
                />
              </div>
            </EuiPanel>

            {/* Errors Panel - Only show when there are errors */}
            {importErrors.length > 0 && (
              <EuiPanel>
                <EuiTitle size="s">
                  <h3>Errors</h3>
                </EuiTitle>
                <EuiSpacer size="m" />

                <div>
                  {importErrors.map((error, index) => (
                    <EuiCallOut key={index} title={error.error} color="danger" iconType="alert">
                      <p>{error.message}</p>
                      {error.line && <p>Line: {error.line}</p>}
                    </EuiCallOut>
                  ))}
                </div>
              </EuiPanel>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPageContent>
  );

  return (
    <Router basename={basename}>
      <I18nProvider>
        <div className="redesigned-data-importer">
          <navigation.ui.TopNavMenu appName={PLUGIN_ID} useDefaultBehaviors={true} />
          <EuiPage paddingSize="s">
            <EuiPageBody component="main">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </EuiPageBody>
          </EuiPage>
        </div>
      </I18nProvider>
    </Router>
  );
};
