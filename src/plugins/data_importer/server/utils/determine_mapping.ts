/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { MappingProperty, MappingTypeMapping } from '@opensearch-project/opensearch/api/types';
import _ from 'lodash';
import { DYNAMIC_MAPPING_TYPES } from '../../common';
import { isBooleanType, isNumericType, isValidDate } from './util';

export const determineMapping = (
  document: Record<string, any>,
  nestedObjectsLimit: number
): MappingTypeMapping => {
  return {
    dynamic: true,
    date_detection: true,
    ...determineType(document, 1, nestedObjectsLimit),
  };
};

const determineType = (
  value: any,
  currentNestedCount: number,
  nestedObjectsLimit: number
): Record<string, MappingProperty> | MappingProperty => {
  if (currentNestedCount >= nestedObjectsLimit) {
    throw Error(`Current document exceeds nested object limit of ${nestedObjectsLimit}`);
  }

  const defaultType = {
    type: DYNAMIC_MAPPING_TYPES.TEXT,
    fields: {
      keyword: {
        type: 'keyword',
        ignore_above: 256,
      },
    },
  };

  switch (true) {
    case Array.isArray(value) && value.length < 1:
    case value == null:
      return { type: DYNAMIC_MAPPING_TYPES.NULL };
    case typeof value === 'string' && value.length === 0:
      return defaultType;
    case isBooleanType(value):
      return { type: DYNAMIC_MAPPING_TYPES.BOOLEAN };
    case isNumericType(value):
      return { type: determineExactNumberType(Number(value)) };
    case isValidDate(_.toString(value)):
      // TODO Dates need further parsing since OpenSearch expects a certain timestamp format
      return defaultType;
    case Array.isArray(value) && value.length > 0:
      return determineTypeForArray(value, currentNestedCount, nestedObjectsLimit);
    case value && typeof value === 'object' && !Array.isArray(value):
      const properties: Record<string, MappingProperty> = {};
      Object.keys(value).forEach((key) => {
        properties[key] = determineType(value[key], currentNestedCount + 1, nestedObjectsLimit);
      });
      return { properties };
    default:
      return defaultType;
  }
};

const determineTypeForArray = (
  array: any[],
  currentNestedCount: number,
  nestedObjectsLimit: number
): MappingProperty => {
  if (array.length === 0) {
    return { type: DYNAMIC_MAPPING_TYPES.NULL };
  }

  // Sample multiple elements to get a better type determination
  const sampleSize = Math.min(array.length, 10); // Sample up to 10 elements
  const sampledElements = [];

  for (let i = 0; i < sampleSize; i++) {
    const index = Math.floor((i * array.length) / sampleSize);
    sampledElements.push(array[index]);
  }

  // Determine types of sampled elements
  const elementTypes = sampledElements.map(element =>
    determineType(element, currentNestedCount, nestedObjectsLimit)
  );

  // If all elements have the same type, use that type
  const firstType = elementTypes[0];
  const allSameType = elementTypes.every(type =>
    JSON.stringify(type) === JSON.stringify(firstType)
  );

  if (allSameType) {
    return firstType;
  }

  // If mixed types but all are objects, try to merge properties
  const allObjects = elementTypes.every(type => type.properties);
  if (allObjects) {
    const mergedProperties: Record<string, MappingProperty> = {};

    elementTypes.forEach(type => {
      const typeWithProperties = type as { properties?: Record<string, MappingProperty> };
      if (typeWithProperties.properties && typeof typeWithProperties.properties === 'object') {
        Object.keys(typeWithProperties.properties).forEach(key => {
          if (!mergedProperties[key] && typeWithProperties.properties) {
            mergedProperties[key] = typeWithProperties.properties[key];
          }
        });
      }
    });

    return { properties: mergedProperties };
  }

  // For mixed primitive types, default to text with keyword mapping
  return {
    type: DYNAMIC_MAPPING_TYPES.TEXT,
    fields: {
      keyword: {
        type: 'keyword',
        ignore_above: 256,
      },
    },
  };
};

const determineExactNumberType = (value: number) => {
  if (Number.isSafeInteger(value)) {
    return DYNAMIC_MAPPING_TYPES.INTEGER;
  } else if (!Number.isInteger(value)) {
    return DYNAMIC_MAPPING_TYPES.FLOAT;
  } else {
    return DYNAMIC_MAPPING_TYPES.DOUBLE;
  }
};
