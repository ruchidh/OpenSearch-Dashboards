/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema, TypeOf } from '@osd/config-schema';
import {
  CSV_FILE_TYPE,
  JSON_FILE_TYPE,
  NDJSON_FILE_TYPE,
  TXT_FILE_TYPE,
  YAML_FILE_TYPE,
  XML_FILE_TYPE,
  TSV_FILE_TYPE,
} from './common/constants';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  enabledFileTypes: schema.arrayOf(schema.string(), {
    defaultValue: [
      CSV_FILE_TYPE,
      JSON_FILE_TYPE,
      NDJSON_FILE_TYPE,
      TXT_FILE_TYPE,
      YAML_FILE_TYPE,
      XML_FILE_TYPE,
      TSV_FILE_TYPE,
    ],
  }),
  maxFileSizeBytes: schema.number({
    defaultValue: 100000000,
    min: 1,
  }),
  maxTextCount: schema.number({
    defaultValue: 10000,
    min: 1,
  }),
  filePreviewDocumentsCount: schema.number({
    defaultValue: 10000,
    min: 1,
  }),
  useRedesignedUI: schema.boolean({ defaultValue: true }),
  enableEnhancedProcessing: schema.boolean({ defaultValue: true }),
  maxRecordsLimit: schema.number({
    defaultValue: 100000,
    min: 1000,
    max: 1000000,
  }),
  defaultChunkSize: schema.number({
    defaultValue: 1000,
    min: 100,
    max: 10000,
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
export type PublicConfigSchema = Omit<ConfigSchema, 'enabled'>;
