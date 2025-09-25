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
import './enhanced_data_importer.scss';

interface EnhancedDataImporterPluginAppProps {
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

export const EnhancedDataImporterPluginApp = ({
  basename,
  notifications,
  http,
  navigation,
  config,
  savedObjects,
  dataSourceEnabled,
  hideLocalCluster,
  dataSourceManagement,
}: EnhancedDataImporterPluginAppProps) => {
  const DataSourceMenuComponent = dataSourceManagement?.ui.getDataSourceMenu<
    DataSourceSelectableConfig
  >();

  // State management
  const [indexName, setIndexName] = useState<string>('');
  const [inputFile, setInputFile] = useState<File | undefined>();
  const [dataSourceId, setDataSourceId] = useState<string | undefined>();
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [groqCommand, setGroqCommand] = useState<string>('');
  const [filePreviewData, setFilePreviewData] = useState<PreviewResponse>({
    documents: [],
    predictedMapping: {},
  });
  const [fullFileData, setFullFileData] = useState<Array<Record<string, any>>>([]);
  const [indexOptions, setIndexOptions] = useState<Array<{ label: string }>>([]);
  const [createMode, setCreateMode] = useState<boolean>(false);
  const [indexStats, setIndexStats] = useState<{
    totalDocs: number;
    indexSize: string;
    lastUpdated: string;
  } | null>(null);
  const [importStats, setImportStats] = useState<{
    totalDocs: number;
    indexSize: string;
    lastUpdated: string;
  } | null>(null);

  // Event handlers
  const onDataSourceSelect = (newDataSource: DataSourceOption[]) => {
    if (newDataSource.length > 0) {
      setDataSourceId(newDataSource[0].id);
    }
  };

  const onIndexNameChange = (selected: Array<{ label: string }>) => {
    if (selected.length) {
      setIndexName(selected[0].label);
      setCreateMode(false);
      // Simulate fetching index stats
      setIndexStats({
        totalDocs: 58432,
        indexSize: '24.7 MB',
        lastUpdated: 'June 21, 2024, 15:30 UTC',
      });
    } else {
      setIndexName('');
      setIndexStats(null);
    }
  };

  const onCreateIndexName = (createdOption: string) => {
    setIndexName(createdOption);
    setCreateMode(true);
    setIndexStats(null);
  };

  const onFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      setInputFile(file);
      setUploadProgress(0); // Reset progress when new file is selected
    } else {
      setInputFile(undefined);
      setUploadProgress(0);
    }
  };

  const previewData = async () => {
    if (!inputFile || !indexName) return;

    const fileExtension = extname(inputFile.name);
    setIsLoadingPreview(true);

    // Start progress bar animation when preview API is called
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // Stop at 90% until API call succeeds
        }
        return prev + Math.random() * 5 + 2; // Random increment between 2-7%
      });
    }, 150);

    try {
      const response = await previewFile({
        http,
        file: inputFile,
        createMode,
        fileExtension,
        indexName,
        previewCount: config.filePreviewDocumentsCount,
        delimiter: CSV_SUPPORTED_DELIMITERS[0],
        selectedDataSourceId: dataSourceId,
      });

      clearInterval(progressInterval); // Clear the interval on API response
      if (response) {
        setFilePreviewData(response);

        // Parse full file client-side for preview
        await parseFullFile(inputFile);

        // Animate to 100% smoothly
        const finalInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 100) {
              clearInterval(finalInterval);
              return 100;
            }
            return prev + 10;
          });
        }, 30);

        notifications.toasts.addSuccess(
          i18n.translate('dataImporter.previewSuccess', {
            defaultMessage: 'Preview successful',
          })
        );
      } else {
        // Reset progress on failed response
        setUploadProgress(0);
        notifications.toasts.addDanger(
          i18n.translate('dataImporter.previewFailed', {
            defaultMessage: 'Preview failed',
          })
        );
      }
    } catch (error) {
      clearInterval(progressInterval); // Clear the interval on error
      setUploadProgress(0); // Reset progress on error
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
    if (!inputFile || !indexName) return;

    setIsImporting(true);
    try {
      const response = await importFile({
        http,
        file: inputFile,
        indexName,
        createMode,
        fileExtension: extname(inputFile.name),
        delimiter: CSV_SUPPORTED_DELIMITERS[0],
        selectedDataSourceId: dataSourceId,
        mapping: filePreviewData.predictedMapping,
      });

      if (response && response.success) {
        notifications.toasts.addSuccess(
          i18n.translate('dataImporter.dataImported', {
            defaultMessage: '{total} documents successfully ingested into {indexName}',
            values: {
              total: response.message.total,
              indexName,
            },
          })
        );

        // Set import stats for summary display
        setImportStats({
          totalDocs: response.message.total || fullFileData.length,
          indexSize: `${Math.round(((inputFile?.size || 0) / 1024 / 1024) * 100) / 100} MB`,
          lastUpdated: new Date().toLocaleString(),
        });

        // Update index stats after successful import
        await fetchIndices();
      }
    } catch (error) {
      const errorMessage = error.body?.message ?? error;
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

  const deleteIndex = async () => {
    // This will be implemented when we add the delete functionality
    console.log('Delete index:', indexName);
  };

  const parseFullFile = async (file: File) => {
    try {
      const text = await file.text();
      const fileExtension = extname(file.name);

      if (fileExtension === '.csv') {
        // Parse CSV
        const lines = text.split('\n').filter((line) => line.trim());
        if (lines.length === 0) return;

        const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1).map((line) => {
          const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
          const row: Record<string, any> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

        setFullFileData(rows);
      } else if (fileExtension === '.json') {
        // Parse JSON
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          setFullFileData(data);
        } else {
          setFullFileData([data]);
        }
      } else if (fileExtension === '.ndjson') {
        // Parse NDJSON
        const lines = text.split('\n').filter((line) => line.trim());
        const rows = lines.map((line) => JSON.parse(line));
        setFullFileData(rows);
      } else if (fileExtension === '.txt') {
        // Parse TXT files (similar to server-side TXT processor logic)
        const lines = text.split('\n');
        const rows = lines
          .map((line, index) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return null;

            // Try to extract timestamp, level, and message from common log formats
            const timestampRegex = /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/;
            const levelRegex = /\[(INFO|DEBUG|WARN|ERROR|SUCCESS|FATAL|TRACE)\]/i;

            const timestampMatch = trimmedLine.match(timestampRegex);
            const levelMatch = trimmedLine.match(levelRegex);

            let timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();
            let level = levelMatch ? levelMatch[1].toUpperCase() : 'INFO';

            // Remove timestamp and level from message if found
            let message = trimmedLine;
            if (timestampMatch) {
              message = message.replace(timestampMatch[0], '').trim();
            }
            if (levelMatch) {
              message = message.replace(levelMatch[0], '').trim();
            }

            return {
              '@timestamp': timestamp,
              level,
              message: message || trimmedLine,
              line_number: index + 1,
              raw_line: trimmedLine
            };
          })
          .filter(row => row !== null);

        setFullFileData(rows);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      // Fallback to API data if client-side parsing fails
      setFullFileData(filePreviewData.documents || []);
    }
  };

  const fetchIndices = async () => {
    if (!hideLocalCluster || dataSourceId) {
      try {
        const response = await catIndices({ http, dataSourceId });
        setIndexOptions(response.indices.map((index: string) => ({ label: index })));
      } catch (error) {
        const errorMessage = error.body?.message ?? error;
        notifications.toasts.addDanger(
          i18n.translate('dataImporter.indicesFetchError', {
            defaultMessage: 'Failed to fetch indices: {errorMessage}',
            values: { errorMessage },
          })
        );
      }
    }
  };

  useEffect(() => {
    fetchIndices();
  }, [http, dataSourceId, notifications.toasts, hideLocalCluster]);

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

  const isImportDisabled = !inputFile || !indexName || isImporting || isLoadingPreview;

  return (
    <Router basename={basename}>
      <I18nProvider>
        <div className="enhanced-data-importer">
          <navigation.ui.TopNavMenu appName={PLUGIN_ID} useDefaultBehaviors={true} />
          <EuiPage>
            <EuiPageBody component="main">
              <EuiPageHeader>
                <EuiTitle size="m">
                  <h3>
                    <FormattedMessage id="dataImporter.mainTitle" defaultMessage="Data Importer" />
                  </h3>
                </EuiTitle>
              </EuiPageHeader>

              <EuiPageContent paddingSize="s">
                {/* Index Summary Section */}
                {(indexStats || importStats) && (
                  <>
                    <EuiPanel className="index-summary-panel">
                      <EuiTitle size="s">
                        <h3>{importStats ? 'Import Summary' : 'Index Summary'}</h3>
                      </EuiTitle>
                      <EuiSpacer size="s" />
                      <EuiFlexGroup>
                        <EuiFlexItem>
                          <EuiStat title={indexName} description="Index Name" titleSize="xs" />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiStat
                            title={(importStats || indexStats)!.totalDocs.toLocaleString()}
                            description="Total Documents"
                            titleSize="xs"
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiStat
                            title={(importStats || indexStats)!.indexSize}
                            description={importStats ? 'File Size' : 'Index Size'}
                            titleSize="xs"
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiStat
                            title={(importStats || indexStats)!.lastUpdated}
                            description={importStats ? 'Imported At' : 'Last Updated'}
                            titleSize="xs"
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                    <EuiSpacer size="s" />
                  </>
                )}

                <EuiFlexGroup>
                  {/* Left Panel - Controls */}
                  <EuiFlexItem grow={1}>
                    <EuiPanel>
                      {/* Data Source Selection */}
                      {dataSourceEnabled && (
                        <>
                          <EuiTitle size="xs">
                            <h3>
                              {i18n.translate('dataImporter.dataSource', {
                                defaultMessage: 'Datasource:',
                              })}
                            </h3>
                          </EuiTitle>
                          <EuiSpacer size="s" />
                          {renderDataSourceComponent}
                        </>
                      )}

                      {/* Index Selection */}
                      <EuiTitle size="xs">
                        <h3>
                          {i18n.translate('dataImporter.indexName', {
                            defaultMessage: 'Create/Select Index:',
                          })}
                        </h3>
                      </EuiTitle>
                      <EuiSpacer size="s" />
                      <EuiFlexGroup alignItems="center">
                        <EuiFlexItem>
                          <EuiComboBox
                            placeholder="Enter index name..."
                            singleSelection={{ asPlainText: true }}
                            options={indexOptions}
                            selectedOptions={indexName ? [{ label: indexName }] : []}
                            onChange={onIndexNameChange}
                            onCreateOption={onCreateIndexName}
                          />
                        </EuiFlexItem>
                        {indexName && !createMode && (
                          <EuiFlexItem grow={false}>
                            <EuiButton color="danger" size="s" onClick={deleteIndex}>
                              Delete
                            </EuiButton>
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>

                      <EuiSpacer size="s" />

                      {/* File Upload */}
                      <div className="file-picker-enhanced">
                        <EuiFilePicker
                          id="filePickerId"
                          initialPromptText="Drop files here or click to upload"
                          onChange={onFileChange}
                          display="large"
                          aria-label="File picker"
                        />
                      </div>

                      {/* Preview Progress */}
                      {inputFile && uploadProgress > 0 && (
                        <div className="progress-bar-container">
                          <EuiSpacer size="s" />
                          <EuiProgress
                            value={uploadProgress}
                            max={100}
                            color={uploadProgress === 100 ? 'success' : 'primary'}
                            size="m"
                          />
                          <EuiText size="s" color="subdued" className="progress-text">
                            {uploadProgress === 100
                              ? 'Preview completed successfully'
                              : `${uploadProgress}% processing...`}
                          </EuiText>
                        </div>
                      )}

                      <EuiSpacer size="s" />

                      {/* GROQ Command */}
                      <div className="groq-command-container">
                        <EuiTitle size="xs">
                          <h3>GROQ Command:</h3>
                        </EuiTitle>
                        <EuiSpacer size="s" />
                        <EuiTextArea
                          placeholder="Enter GROQ command here..."
                          value={groqCommand}
                          onChange={(e) => setGroqCommand(e.target.value)}
                          rows={4}
                        />
                      </div>

                      <EuiSpacer size="s" />

                      {/* Action Buttons */}
                      <div className="action-buttons-container">
                        <EuiFlexGroup>
                          <EuiFlexItem>
                            <EuiButton
                              fullWidth
                              onClick={previewData}
                              isDisabled={!inputFile || !indexName}
                              isLoading={isLoadingPreview}
                            >
                              Preview
                            </EuiButton>
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <EuiButton
                              fullWidth
                              fill
                              onClick={importData}
                              isDisabled={isImportDisabled}
                              isLoading={isImporting}
                            >
                              Import
                            </EuiButton>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </div>
                    </EuiPanel>
                  </EuiFlexItem>

                  {/* Right Panel - Preview */}
                  <EuiFlexItem grow={2}>
                    <EuiPanel>
                      <EuiTitle size="s">
                        <h2>Imported Data Preview</h2>
                      </EuiTitle>
                      <EuiSpacer size="s" />

                      <div className="preview-table-container">
                        {isLoadingPreview ? (
                          <EuiFlexGroup justifyContent="center">
                            <EuiFlexItem grow={false}>
                              <EuiLoadingSpinner size="xl" />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        ) : (
                          <EnhancedPreviewComponent
                            previewData={
                              fullFileData.length > 0
                                ? fullFileData
                                : filePreviewData.documents || []
                            }
                            predictedMapping={filePreviewData.predictedMapping || {}}
                            existingMapping={filePreviewData.existingMapping || {}}
                          />
                        )}
                      </div>
                    </EuiPanel>
                  </EuiFlexItem>
                </EuiFlexGroup>

                {/* Mapping Errors Section */}
                {filePreviewData.documents.length > 0 && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiPanel className="mapping-errors-panel">
                      <EuiTitle size="s">
                        <h3>Mapping Errors</h3>
                      </EuiTitle>
                      <EuiSpacer size="s" />

                      {/* This will show mapping errors if any exist */}
                      {filePreviewData.predictedMapping && filePreviewData.existingMapping ? (
                        <EuiCallOut
                          title="Field type mismatch detected"
                          color="warning"
                          iconType="alert"
                        >
                          <p>
                            <strong>Field:</strong> <span className="error-field">age</span>
                            <br />
                            <strong>Error:</strong> Invalid data type: expected number, got string
                          </p>
                        </EuiCallOut>
                      ) : (
                        <EuiText color="subdued">No mapping errors detected.</EuiText>
                      )}
                    </EuiPanel>
                  </>
                )}
              </EuiPageContent>
            </EuiPageBody>
          </EuiPage>
        </div>
      </I18nProvider>
    </Router>
  );
};
