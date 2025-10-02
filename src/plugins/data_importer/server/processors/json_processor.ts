/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Readable } from 'stream';
import { IFileProcessor, IngestOptions, ParseOptions, ValidationOptions } from '../types';
import { isValidObject } from '../utils/util';

export class JSONProcessor implements IFileProcessor {

  /**
   * Recursively flattens arrays and nested arrays into individual documents
   */
  private flattenToDocuments(data: any): Array<Record<string, any>> {
    const documents: Array<Record<string, any>> = [];

    const processItem = (item: any) => {
      if (Array.isArray(item)) {
        // If it's an array, recursively process each item
        item.forEach(processItem);
      } else if (item && typeof item === 'object' && isValidObject(item)) {
        // If it's a valid object, add it as a document
        documents.push(item);
      }
      // Skip primitive values, null, or invalid objects
    };

    processItem(data);
    return documents;
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
    const document = JSON.parse(text);
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
            const document = JSON.parse(rawData);
            if (!isValidObject(document)) {
              resolve(0);
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
