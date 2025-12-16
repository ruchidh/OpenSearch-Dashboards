/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import _ from 'lodash';
import moment from 'moment';
import { FileProcessorService } from '../processors/file_processor_service';
import { OpenSearchClient, RequestHandlerContext } from '../../../../core/server';

export const decideClient = async (
  dataSourceEnabled: boolean,
  context: RequestHandlerContext,
  dataSourceId?: string
): Promise<OpenSearchClient> => {
  return dataSourceEnabled && dataSourceId
    ? await context.dataSource.opensearch.getClient(dataSourceId)
    : context.core.opensearch.client.asCurrentUser;
};

export const validateFileTypes = (fileTypes: string[], fileProcessors: FileProcessorService) => {
  const nonRegisteredFileTypes = fileTypes.filter(
    (fileType) => !fileProcessors.hasFileProcessorBeenRegistered(fileType)
  );
  if (nonRegisteredFileTypes.length > 0) {
    throw new Error(
      `The following enabledFileTypes are not registered: ${nonRegisteredFileTypes.join(', ')}`
    );
  }
};

export const isValidDate = (date: string) => {
  return (
    moment(date, moment.ISO_8601, true).isValid() || moment(date, moment.RFC_2822, true).isValid()
  );
};

export const isBooleanType = (value: any) => {
  return value === 'true' || value === 'false' || typeof value === 'boolean';
};

export const isNumericType = (value: any) => {
  return !isNaN(Number(value));
};

export const mergeCustomizerForPreview = (objValue: any, srcValue: any) => {
  if (!isBooleanType(objValue) && !isNumericType(objValue)) {
    return objValue;
  } else {
    return srcValue;
  }
};

const flattenObject = (obj: Record<string, any>, prefix: string = '') => {
  const result: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (Array.isArray(value)) {
      // For arrays, we still want to validate the structure
      // Add the array itself as a field
      result[fullKey] = value;

      // Also flatten any objects within the array
      value.forEach((item, index) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const arrayItemFlattened = flattenObject(item, `${fullKey}.${index}`);
          Object.assign(result, arrayItemFlattened);
        }
      });
    } else if (value && typeof value === 'object') {
      const nested = flattenObject(value, fullKey);
      if (Object.keys(nested).length === 0) {
        result[`${fullKey}.`] = null;
      } else {
        Object.assign(result, nested);
      }
    } else {
      result[fullKey] = value;
    }
  }

  return result;
};

export const isValidObject = (obj: Record<string, any>) => {
  if (Object.keys(obj).length === 0) {
    return false;
  }

  const flattenedObject = flattenObject(obj);

  if (Object.keys(flattenedObject).length === 0) {
    return false;
  }

  const keys = Object.keys(flattenedObject).map((key) => key.replace(/\s/g, ''));
  return keys.every(
    (key) =>
      key.length > 0 && !key.startsWith('.') && !key.endsWith('.') && !!!key.match(/(\.\.)+/g)
  );
};

export const fetchDepthLimit = async (client: OpenSearchClient) => {
  const defaultLimit = 20;

  try {
    const clusterSettings = (
      await client.cluster.getSettings({
        include_defaults: true,
        filter_path: '**.depth.limit',
      })
    ).body;

    const defaultSettingsRaw = Number(clusterSettings.defaults?.indices?.mapping?.depth?.limit);
    const defaultSettings = !isNaN(defaultSettingsRaw) ? defaultSettingsRaw : defaultLimit;

    const persistentSettingsRaw = Number(clusterSettings.persistent.indices?.mapping?.depth?.limit);
    const persistentSettings = !isNaN(persistentSettingsRaw) ? persistentSettingsRaw : defaultLimit;

    const transientSettingsRaw = Number(clusterSettings.transient.indices?.mapping?.depth?.limit);
    const transientSettings = !isNaN(transientSettingsRaw) ? transientSettingsRaw : defaultLimit;

    // To ensure maximum compatibility, we're only considering the minimum of all 3 settings
    return Math.min(defaultSettings, persistentSettings, transientSettings);
  } catch (e) {
    return defaultLimit;
  }
};
