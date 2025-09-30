/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '../../../core/public';
import { DataImporterPluginStartDependencies } from './types';
import { EnhancedDataImporterPluginApp } from './components/enhanced_data_importer_app';
import { RedesignedDataImporterPluginApp } from './components/redesigned_data_importer_app';
import { PublicConfigSchema } from '../config';
import { DataImporterPluginSetupDeps } from './types';

export const renderApp = (
  { notifications, http, savedObjects }: CoreStart,
  { navigation }: DataImporterPluginStartDependencies,
  { appBasePath, element }: AppMountParameters,
  { dataSource, dataSourceManagement }: DataImporterPluginSetupDeps,
  config: PublicConfigSchema
) => {
  // Use the redesigned UI by default, with fallback to enhanced version
  const useRedesignedUI = config.useRedesignedUI !== false; // Default to true

  ReactDOM.render(
    useRedesignedUI ? (
      <RedesignedDataImporterPluginApp
        basename={appBasePath}
        notifications={notifications}
        http={http}
        navigation={navigation}
        config={config}
        savedObjects={savedObjects}
        dataSourceEnabled={!!dataSource}
        hideLocalCluster={dataSource?.hideLocalCluster || false}
        dataSourceManagement={dataSourceManagement}
      />
    ) : (
      <EnhancedDataImporterPluginApp
        basename={appBasePath}
        notifications={notifications}
        http={http}
        navigation={navigation}
        config={config}
        savedObjects={savedObjects}
        dataSourceEnabled={!!dataSource}
        hideLocalCluster={dataSource?.hideLocalCluster || false}
        dataSourceManagement={dataSourceManagement}
      />
    ),
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
