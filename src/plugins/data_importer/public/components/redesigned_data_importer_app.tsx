/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { I18nProvider } from '@osd/i18n/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { EuiPage, EuiPageBody, EuiPageHeader } from '@elastic/eui';
import { DataSourceManagementPluginSetup } from '../../../data_source_management/public';
import { CoreStart } from '../../../../core/public';
import { NavigationPublicPluginStart } from '../../../navigation/public';
import { PLUGIN_ID } from '../../common';
import { PublicConfigSchema } from '../../config';
import { DataUploadStep, DataConfigureStep, DataImportCompleteStep } from './steps';
import { StepProgress } from './step_progress';
import {
  useDataImporterState,
  useFileHandling,
  useDataSourceManagement,
  useDataOperations,
  useValidation,
} from '../hooks';
import { createStepConfiguration, createClearHandler } from '../utils/step-utils';
import './redesigned_data_importer.scss';

interface RedesignedDataImporterPluginAppProps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  savedObjects: CoreStart['savedObjects'];
  application: CoreStart['application'];
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
  application,
  navigation,
  config,
  savedObjects,
  dataSourceEnabled,
  hideLocalCluster,
  dataSourceManagement,
}: RedesignedDataImporterPluginAppProps) => {
  // Initialize state with custom hook
  const { state, actions } = useDataImporterState(config);

  // Initialize file handling logic
  const fileHandling = useFileHandling(state, actions);

  // Initialize data source management
  const dataSourceManagement_ = useDataSourceManagement({
    state,
    actions,
    http,
    savedObjects,
    notifications,
    dataSourceEnabled,
    hideLocalCluster,
    dataSourceManagement,
  });

  // Initialize data operations
  const dataOperations = useDataOperations({
    state,
    actions,
    http,
    notifications,
    config,
  });

  // Initialize validation
  const validation = useValidation({
    state,
    config,
    notifications,
    dataSourceEnabled,
  });

  // Create step configuration
  const steps = createStepConfiguration(state.currentStep);

  // Create clear handler
  const handleClear = createClearHandler(
    actions.setCurrentStep,
    actions.setIndexName,
    actions.setFilePreviewData
  );

  // Create time field change handler
  const handleTimeFieldChange = useCallback(
    (selected: Array<{ label: string }>) => {
      actions.setTimeField(selected[0]?.label || '');
    },
    [actions]
  );

  // Create import handler with fetch indices callback
  const handleImport = useCallback(() => {
    // Create a simple fetchIndices function for the import operation
    const fetchIndices = async () => {
      // This is handled automatically by the useEffect in useDataSourceManagement
      // No need to do anything here as indices are already being fetched
    };
    dataOperations.importData(fetchIndices);
  }, [dataOperations]);

  // Render step progress indicator
  const renderStepProgress = useCallback(
    () => <StepProgress steps={steps} currentStep={state.currentStep} />,
    [steps, state.currentStep]
  );

  return (
    <Router basename={basename}>
      <I18nProvider>
        <div className="redesigned-data-importer">
          <navigation.ui.TopNavMenu appName={PLUGIN_ID} useDefaultBehaviors={true} />
          <EuiPageHeader pageTitle="Data Importer" paddingSize="s" />
          <EuiPage paddingSize="s">
            <EuiPageBody component="main">
              {state.currentStep === 1 && (
                <DataUploadStep
                  config={config}
                  indexName={state.indexName}
                  inputFile={state.inputFile}
                  textInput={state.textInput}
                  textFileType={state.textFileType}
                  indexOptions={state.indexOptions}
                  delimiter={state.delimiter}
                  showDelimiterChoice={state.showDelimiterChoice}
                  onIndexNameChange={dataSourceManagement_.onIndexNameChange}
                  onCreateIndexName={dataSourceManagement_.onCreateIndexName}
                  onFileChange={fileHandling.onFileChange}
                  onTextInputChange={fileHandling.onTextInputChange}
                  onTextFileTypeChange={fileHandling.onTextFileTypeChange}
                  onDelimiterChange={fileHandling.onDelimiterChange}
                  onPreviewClick={dataOperations.previewData}
                  canProceedToStep2={validation.canProceedToStep2}
                  renderDataSourceComponent={dataSourceManagement_.renderDataSourceComponent}
                  renderStepProgress={renderStepProgress}
                />
              )}
              {state.currentStep === 2 && (
                <DataConfigureStep
                  dataSourceName={state.dataSourceName}
                  dataSourceEnabled={dataSourceEnabled}
                  indexName={state.indexName}
                  timeField={state.timeField}
                  availableTimeFields={state.availableTimeFields}
                  filePreviewData={state.filePreviewData}
                  isLoadingPreview={state.isLoadingPreview}
                  importErrors={state.importErrors}
                  isImporting={state.isImporting}
                  groqInput={state.groqInput}
                  delimiter={state.delimiter}
                  showDelimiterChoice={state.showDelimiterChoice}
                  onBackToUpload={() => actions.setCurrentStep(1)}
                  onClear={handleClear}
                  onImport={handleImport}
                  onTimeFieldChange={handleTimeFieldChange}
                  onGroqInputChange={actions.setGroqInput}
                  canProceedToStep3={validation.canProceedToStep3}
                  renderStepProgress={renderStepProgress}
                />
              )}
              {state.currentStep === 3 && (
                <DataImportCompleteStep
                  indexName={state.indexName}
                  importStats={state.importStats}
                  filePreviewData={state.filePreviewData}
                  importErrors={state.importErrors}
                  onRestart={actions.resetWorkflow}
                  application={application}
                  http={http}
                  renderStepProgress={renderStepProgress}
                />
              )}
            </EuiPageBody>
          </EuiPage>
        </div>
      </I18nProvider>
    </Router>
  );
};
