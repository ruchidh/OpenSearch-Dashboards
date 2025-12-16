/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Readable } from 'stream';
import { IFileProcessor, IngestOptions, ParseOptions, ValidationOptions } from '../types';
import { isValidObject } from '../utils/util';

export class JSONProcessor implements IFileProcessor {

  /**
   * Recursively flattens arrays and nested arrays into individual documents,
   * while properly handling nested objects and arrays within those objects.
   * Enhanced to handle complex JSON structures with nested arrays.
   */
  private flattenToDocuments(data: any): Array<Record<string, any>> {
    const documents: Array<Record<string, any>> = [];

    const processItem = (item: any, parentKey?: string) => {
      if (Array.isArray(item)) {
        // If it's an array, recursively process each item
        item.forEach(arrayItem => processItem(arrayItem, parentKey));
      } else if (item && typeof item === 'object' && isValidObject(item)) {
        // Check if this object contains arrays that should be flattened
        const arrayKeys = Object.keys(item).filter(key => Array.isArray(item[key]));

        if (arrayKeys.length > 0) {
          // If object has arrays, check if they contain meaningful documents
          let hasExtractedFromArrays = false;

          for (const arrayKey of arrayKeys) {
            const arrayValue = item[arrayKey];
            if (arrayValue.length > 0 && arrayValue.every((arrItem: any) =>
              arrItem && typeof arrItem === 'object' && isValidObject(arrItem))) {
              // This array contains valid objects, extract them as separate documents
              arrayValue.forEach((arrItem: any) => {
                const processedItem = this.processNestedObject(arrItem);
                // Optionally add context about which array this came from
                if (arrayKey && arrayKey !== 'items' && arrayKey !== 'data') {
                  processedItem._source_array = arrayKey;
                }
                documents.push(processedItem);
              });
              hasExtractedFromArrays = true;
            }
          }

          // If we didn't extract meaningful documents from arrays, treat the whole object as a document
          if (!hasExtractedFromArrays) {
            const processedObject = this.processNestedObject(item);
            documents.push(processedObject);
          }
        } else {
          // No arrays in this object, process it as a single document
          const processedObject = this.processNestedObject(item);
          documents.push(processedObject);
        }
      }
      // Skip primitive values, null, or invalid objects
    };

    processItem(data);

    // If no documents were extracted, fall back to treating the whole input as one document
    if (documents.length === 0 && data && typeof data === 'object' && isValidObject(data)) {
      documents.push(this.processNestedObject(data));
    }

    return documents;
  }

  /**
   * Processes nested objects to handle arrays and nested structures properly
   */
  private processNestedObject(obj: Record<string, any>): Record<string, any> {
    const processed: Record<string, any> = {};

    Object.keys(obj).forEach(key => {
      const value = obj[key];

      if (Array.isArray(value)) {
        // For arrays, preserve the array structure but ensure all elements are properly processed
        processed[key] = value.map(item => {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            return this.processNestedObject(item);
          }
          return item;
        });
      } else if (value && typeof value === 'object') {
        // For nested objects, recursively process them
        processed[key] = this.processNestedObject(value);
      } else {
        // For primitive values, keep as-is
        processed[key] = value;
      }
    });

    return processed;
  }

  public async validateText(text: string, _: ValidationOptions) {
    if (text.length < 1) {
      return false;
    }
    try {
      const obj = JSON.parse(text);

      // Check if it's a valid single object or can be flattened to valid documents
      if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
          // For arrays, check if we can extract at least one valid document
          const documents = this.flattenToDocuments(obj);
          return documents.length > 0;
        } else {
          // For single objects, use the existing validation
          return isValidObject(obj);
        }
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  public async ingestText(text: string, options: IngestOptions) {
    const { client, indexName } = options;
    const parsedData = JSON.parse(text);

    // Use the improved processing logic for consistent handling
    const documents = this.flattenToDocuments(parsedData);
    const document = documents.length > 0 ? documents[0] : parsedData;

    const isSuccessful = await new Promise<boolean>(async (resolve) => {
      try {
        await client.index({
          index: indexName,
          body: document,
        });
        resolve(true);
      } catch (e) {
        resolve(false);
      }
    });

    const total = isSuccessful ? 1 : 0;

    return {
      total: 1,
      message: `Indexed ${total} document`,
      failedRows: isSuccessful ? [] : [1],
    };
  }

  public async ingestFile(file: Readable, options: IngestOptions) {
    const { client, indexName } = options;

    const numSucessfulDocs = await new Promise<number>((resolve) => {
      let rawData = '';
      file
        .on('data', (chunk) => (rawData += chunk))
        .on('error', (_) => resolve(0))
        .on('end', async () => {
          try {
            const parsedData = JSON.parse(rawData);

            // Use the improved processing logic for consistent handling
            const documents = this.flattenToDocuments(parsedData);
            const document = documents.length > 0 ? documents[0] : parsedData;

            if (!isValidObject(document)) {
              resolve(0);
              return;
            }

            await client.index({
              index: indexName,
              body: document,
            });
            resolve(1);
          } catch (_) {
            resolve(0);
          }
        });
    });

    return {
      total: 1,
      message: `Indexed ${numSucessfulDocs} document`,
      failedRows: numSucessfulDocs === 1 ? [] : [1],
    };
  }

  public async parseFile(file: Readable, limit: number, _: ParseOptions) {
    const documents: Array<Record<string, any>> = [];
    await new Promise<void>((resolve, reject) => {
      let rawData = '';
      file
        .on('data', (chunk) => (rawData += chunk))
        .on('error', (e) => reject(e))
        .on('end', async () => {
          try {
            const parsedData = JSON.parse(rawData);

            // Use the new flattening logic to handle arrays and nested structures
            const flattenedDocuments = this.flattenToDocuments(parsedData);

            if (flattenedDocuments.length === 0) {
              reject(
                new Error('No valid documents found in the JSON data')
              );
              return;
            }

            // Apply limit if specified
            const limitedDocuments = limit > 0 ? flattenedDocuments.slice(0, limit) : flattenedDocuments;
            documents.push(...limitedDocuments);

          } catch (e) {
            reject(e);
          }
          resolve();
        });
    });

    return documents;
  }
}
