/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const PLUGIN_NAME_AS_TITLE = 'Import Data';
export const PLUGIN_DESCRIPTION =
  'Import data from files (CSV, JSON, NDJSON, TXT, YAML, XML, TSV) into OpenSearch indexes.';
export const PLUGIN_ID = 'dataImporter';
export const PLUGIN_NAME = 'dataImporter';

export const CSV_FILE_TYPE = 'csv';
export const JSON_FILE_TYPE = 'json';
export const NDJSON_FILE_TYPE = 'ndjson';
export const TXT_FILE_TYPE = 'txt';
export const YAML_FILE_TYPE = 'yaml';
export const XML_FILE_TYPE = 'xml';
export const TSV_FILE_TYPE = 'tsv';

export const DEFAULT_SUPPORTED_FILE_TYPES_LIST = [
  CSV_FILE_TYPE,
  JSON_FILE_TYPE,
  NDJSON_FILE_TYPE,
  TXT_FILE_TYPE,
  YAML_FILE_TYPE,
  XML_FILE_TYPE,
  TSV_FILE_TYPE,
];

export const CSV_SUPPORTED_DELIMITERS = [',', ';', '\t', '|'];

export enum DYNAMIC_MAPPING_TYPES {
  NULL = 'null',
  BOOLEAN = 'boolean',
  FLOAT = 'float',
  DOUBLE = 'double',
  INTEGER = 'integer',
  OBJECT = 'object',
  ARRAY = 'array',
  TEXT = 'text',
  KEYWORD = 'keyword',
  DATE = 'date',
}
