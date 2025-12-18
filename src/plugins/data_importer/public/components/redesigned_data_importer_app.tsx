/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { I18nProvider } from '@osd/i18n/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { EuiPage, EuiPageBody, EuiPageHeader } from '@elastic/eui';
import { DataSourceManagementPluginSetup } from '../../../data_source_management/public';
import { CoreStart } from '../../../../core/public';
import { NavigationPublicPluginStart } from '../../../navigation/public';
import { PLUGIN_ID } from '../../common';
import { PublicConfigSchema } from '../../config';
import { DataUploadStep, DataConfigureStep, DataImportCompleteStep } from './steps';
import { StepWrapper } from './step_wrapper';
import { useDataImporterState, useFileHandling, useDataOperations, useValidation } from '../hooks';
import { createClearHandler } from '../utils/step-utils';
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
  // Initialize state with custom hook
  const { state, actions } = useDataImporterState(config);

  // Initialize file handling logic
  const fileHandling = useFileHandling(state, actions);

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

  // Create clear handler
  const handleClear = createClearHandler(
    actions.setCurrentStep,
    actions.setIndexName,
    actions.setFilePreviewData
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
                <StepWrapper currentStep={state.currentStep}>
                  <DataUploadStep
                    config={config}
                    indexName={state.indexName}
                    inputFile={state.inputFile}
                    textInput={state.textInput}
                    textFileType={state.textFileType}
                    indexOptions={state.indexOptions}
                    delimiter={state.delimiter}
                    showDelimiterChoice={state.showDelimiterChoice}
                    isLoadingPreview={state.isLoadingPreview}
                    fileOperations={fileHandling}
                    dataOperations={{
                      previewData: dataOperations.previewData,
                      clearConflicts: dataOperations.clearConflicts,
                    }}
                    actions={{
                      setDataSourceId: actions.setDataSourceId,
                      setDataSourceName: actions.setDataSourceName,
                      setIndexName: actions.setIndexName,
                      setCreateMode: actions.setCreateMode,
                      setIndexOptions: actions.setIndexOptions,
                    }}
                    http={http}
                    savedObjects={savedObjects}
                    notifications={notifications}
                    dataSourceEnabled={dataSourceEnabled}
                    hideLocalCluster={hideLocalCluster}
                    dataSourceManagement={dataSourceManagement}
                    dataSourceId={state.dataSourceId}
                    dataSourceName={state.dataSourceName}
                    canProceedToStep2={validation.canProceedToStep2}
                    mappingConflicts={state.filePreviewData.mappingConflicts}
                  />
                </StepWrapper>
              )}
              {state.currentStep === 2 && (
                <StepWrapper currentStep={state.currentStep}>
                  <DataConfigureStep
                    dataSourceName={state.dataSourceName}
                    dataSourceEnabled={dataSourceEnabled}
                    indexName={state.indexName}
                    timeField={state.timeField}
                    availableTimeFields={state.availableTimeFields}
                    filePreviewData={state.filePreviewData}
                    isLoadingPreview={state.isLoadingPreview}
                    isImporting={state.isImporting}
                    groqInput={state.groqInput}
                    actions={{
                      setTimeField: actions.setTimeField,
                      setGroqInput: actions.setGroqInput,
                    }}
                    dataOperations={dataOperations}
                    onBackToUpload={() => actions.setCurrentStep(1)}
                    onClear={handleClear}
                    onUpdatePreview={dataOperations.updatePreviewWithGroq}
                    canProceedToStep3={validation.canProceedToStep3}
                  />
                </StepWrapper>
              )}
              {state.currentStep === 3 && (
                <StepWrapper currentStep={state.currentStep}>
                  <DataImportCompleteStep
                    indexName={state.indexName}
                    importStats={state.importStats}
                    filePreviewData={state.filePreviewData}
                    importErrors={state.importErrors}
                    onRestart={actions.resetWorkflow}
                    http={http}
                  />
                </StepWrapper>
              )}
            </EuiPageBody>
          </EuiPage>
        </div>
      </I18nProvider>
    </Router>
  );
};
