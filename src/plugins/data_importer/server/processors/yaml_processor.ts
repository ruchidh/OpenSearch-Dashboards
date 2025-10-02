/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Readable } from 'stream';
import { IFileProcessor, IngestOptions, ParseOptions, ValidationOptions } from '../types';
import { isValidObject } from '../utils/util';

export class YAMLProcessor implements IFileProcessor {

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
      // For now, we'll use a basic YAML validation
      // In production, you'd want to add a YAML parser library like 'js-yaml'
      const yamlPattern = /^[\s]*[-\w\s:]+/;
      return yamlPattern.test(text);
    } catch (e) {
      return false;
    }
  }

  public async ingestText(text: string, options: IngestOptions) {
    const { client, indexName } = options;

    try {
      // Parse YAML to JSON (would need js-yaml library)
      // For now, treating as JSON fallback
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
    } catch (error) {
      return {
        total: 1,
        message: 'Failed to parse YAML content',
        failedRows: [1],
      };
    }
  }

  public async ingestFile(file: Readable, options: IngestOptions) {
    const { client, indexName } = options;

    const numSuccessfulDocs = await new Promise<number>((resolve) => {
      let rawData = '';
      file
        .on('data', (chunk) => (rawData += chunk))
        .on('error', (_) => resolve(0))
        .on('end', async () => {
          try {
            // Parse YAML content (would use js-yaml in production)
            // For now, fallback to JSON parsing
            const document = JSON.parse(rawData);

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
      message: `Indexed ${numSuccessfulDocs} document`,
      failedRows: numSuccessfulDocs === 1 ? [] : [1],
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
            // Parse YAML content (would use js-yaml library in production)
            // For demo purposes, falling back to JSON parsing
            let parsedData;

            try {
              // Try JSON first
              parsedData = JSON.parse(rawData);
            } catch {
              // If JSON fails, try basic YAML-like structure conversion
              // This is a simplified approach - real implementation would use js-yaml
              parsedData = this.simpleYamlToJson(rawData);
            }

            // Use the flattening logic to handle arrays and nested structures
            const flattenedDocuments = this.flattenToDocuments(parsedData);

            if (flattenedDocuments.length === 0) {
              reject(new Error('No valid documents found in the YAML data'));
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

  /**
   * Simple YAML-like to JSON converter (for demo purposes)
   * In production, use a proper YAML library like js-yaml
   */
  private simpleYamlToJson(yamlText: string): any {
    try {
      // Very basic YAML-like parsing - this is just for demonstration
      // Real implementation should use js-yaml library
      const lines = yamlText.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
      const result: any = {};

      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();

          // Try to parse value as number, boolean, or keep as string
          if (value === 'true' || value === 'false') {
            result[key] = value === 'true';
          } else if (!isNaN(Number(value)) && value !== '') {
            result[key] = Number(value);
          } else {
            result[key] = value;
          }
        }
      }

      return result;
    } catch {
      throw new Error('Invalid YAML format');
    }
  }
}