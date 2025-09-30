/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { first } from 'rxjs/operators';
import { TypeOf } from '@osd/config-schema';
import { DataSourcePluginSetup } from '../../data_source/server';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/server';
import { configSchema } from '../config';
import { DataImporterPluginSetup, DataImporterPluginStart } from './types';
import { importFileRoute } from './routes/import_file';
import { CSVProcessor } from './processors/csv_processor';
import { importTextRoute } from './routes/import_text';
import { CSV_FILE_TYPE, JSON_FILE_TYPE, NDJSON_FILE_TYPE, TXT_FILE_TYPE, PLUGIN_NAME } from '../common/constants';
import { NDJSONProcessor } from './processors/ndjson_processor';
import { JSONProcessor } from './processors/json_processor';
import { TXTProcessor } from './processors/txt_processor';
import { FileProcessorService } from './processors/file_processor_service';
import { EnhancedFileProcessorService } from './processors/enhanced_file_processor_service';
import { validateFileTypes } from './utils/util';
import { previewRoute } from './routes/preview';
import { catIndicesRoute } from './routes/cat_indices';
import {
  registerEnhancedImportFileRoute,
  registerEnhancedPreviewRoute,
  registerEnhancedValidationRoute,
} from './routes/enhanced_import_file';

export interface DataImporterPluginSetupDeps {
  dataSource?: DataSourcePluginSetup;
}

export class DataImporterPlugin
  implements Plugin<DataImporterPluginSetup, DataImporterPluginStart> {
  private readonly fileProcessors: FileProcessorService = new FileProcessorService();
  private readonly enhancedFileProcessors: EnhancedFileProcessorService;
  private config: TypeOf<typeof configSchema> | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.enhancedFileProcessors = new EnhancedFileProcessorService(this.initializerContext.logger.get());
  }

  public async setup(
    core: CoreSetup,
    { dataSource }: DataImporterPluginSetupDeps
  ): Promise<DataImporterPluginSetup> {
    this.config = await this.initializerContext.config
      .create<TypeOf<typeof configSchema>>()
      .pipe(first())
      .toPromise();

    const router = core.http.createRouter();

    // Register default file processors
    this.fileProcessors.registerFileProcessor(CSV_FILE_TYPE, new CSVProcessor());
    this.fileProcessors.registerFileProcessor(NDJSON_FILE_TYPE, new NDJSONProcessor());
    this.fileProcessors.registerFileProcessor(JSON_FILE_TYPE, new JSONProcessor());
    this.fileProcessors.registerFileProcessor(TXT_FILE_TYPE, new TXTProcessor());

    // Register enhanced file processors
    this.enhancedFileProcessors.registerFileProcessor(CSV_FILE_TYPE, new CSVProcessor());
    this.enhancedFileProcessors.registerFileProcessor(NDJSON_FILE_TYPE, new NDJSONProcessor());
    this.enhancedFileProcessors.registerFileProcessor(JSON_FILE_TYPE, new JSONProcessor());
    this.enhancedFileProcessors.registerFileProcessor(TXT_FILE_TYPE, new TXTProcessor());

    // Register server side APIs
    importFileRoute(router, this.config, this.fileProcessors, !!dataSource);
    importTextRoute(router, this.config, this.fileProcessors, !!dataSource);
    previewRoute(router, this.config, this.fileProcessors, !!dataSource);
    catIndicesRoute(router, !!dataSource);

    // Register enhanced APIs for large dataset handling
    registerEnhancedImportFileRoute(router, this.enhancedFileProcessors);
    registerEnhancedPreviewRoute(router, this.enhancedFileProcessors);
    registerEnhancedValidationRoute(router, this.enhancedFileProcessors);

    return {
      registerFileProcessor: (fileType, fileProcessor) => {
        this.fileProcessors.registerFileProcessor(fileType, fileProcessor);
      },
    };
  }

  public start(_: CoreStart): DataImporterPluginStart {
    try {
      // Config values have to be validated at start() since file types can be registered in other plugins
      validateFileTypes(this.config!.enabledFileTypes, this.fileProcessors);
    } catch (e) {
      throw new Error(`Error when calling start() for ${PLUGIN_NAME}: `, e);
    }

    return {};
  }

  public stop() {}
}
