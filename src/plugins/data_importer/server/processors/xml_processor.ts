/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Readable } from 'stream';
import { IFileProcessor, IngestOptions, ParseOptions, ValidationOptions } from '../types';
import { isValidObject } from '../utils/util';

export class XMLProcessor implements IFileProcessor {

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
      // Basic XML validation - check for XML structure
      const xmlPattern = /^\s*<\?xml|^\s*<\w+/;
      return xmlPattern.test(text) || text.includes('<') && text.includes('>');
    } catch (e) {
      return false;
    }
  }

  public async ingestText(text: string, options: IngestOptions) {
    const { client, indexName } = options;

    try {
      // Parse XML to JSON (would need xml2js library)
      const document = this.simpleXmlToJson(text);

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
        message: 'Failed to parse XML content',
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
            // Parse XML content (would use xml2js in production)
            const document = this.simpleXmlToJson(rawData);

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
            // Parse XML content
            const parsedData = this.simpleXmlToJson(rawData);

            // Use the flattening logic to handle arrays and nested structures
            const flattenedDocuments = this.flattenToDocuments(parsedData);

            if (flattenedDocuments.length === 0) {
              reject(new Error('No valid documents found in the XML data'));
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
   * Simple XML to JSON converter (for demo purposes)
   * In production, use a proper XML library like xml2js or fast-xml-parser
   */
  private simpleXmlToJson(xmlText: string): any {
    try {
      // Very basic XML parsing - this is just for demonstration
      // Real implementation should use xml2js or similar library

      // Remove XML declaration and comments
      let cleanXml = xmlText.replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim();

      // Simple regex-based parsing (NOT recommended for production)
      const tagPattern = /<(\w+)(?:[^>]*)>([^<]*)<\/\1>/g;
      const result: any = {};
      let match;

      while ((match = tagPattern.exec(cleanXml)) !== null) {
        const [, tagName, content] = match;

        // Try to parse content as number, boolean, or keep as string
        let value: any = content.trim();
        if (value === 'true' || value === 'false') {
          value = value === 'true';
        } else if (!isNaN(Number(value)) && value !== '') {
          value = Number(value);
        }

        // Handle multiple elements with same tag name
        if (result[tagName]) {
          if (Array.isArray(result[tagName])) {
            result[tagName].push(value);
          } else {
            result[tagName] = [result[tagName], value];
          }
        } else {
          result[tagName] = value;
        }
      }

      // If no matches found, try to extract root element
      if (Object.keys(result).length === 0) {
        const rootMatch = cleanXml.match(/<(\w+)[^>]*>([\s\S]*)<\/\1>/);
        if (rootMatch) {
          const [, rootTag, content] = rootMatch;
          result[rootTag] = content.trim() || 'XML content';
        } else {
          result['content'] = cleanXml;
        }
      }

      return result;
    } catch (error) {
      throw new Error('Invalid XML format');
    }
  }
}