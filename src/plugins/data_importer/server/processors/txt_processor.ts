/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Readable } from 'stream';
import { IFileProcessor, IngestOptions, ParseOptions, ValidationOptions } from '../types';
import { isValidObject } from '../utils/util';

export class TXTProcessor implements IFileProcessor {
  public async validateText(text: string, options: ValidationOptions) {
    // Basic validation - check if text is not empty and has readable content
    if (!text || text.trim().length === 0) {
      return false;
    }

    // Check for basic text patterns (not binary data)
    const textPattern = /^[\s\S]*$/;
    return textPattern.test(text);
  }

  private parseLogLine(line: string, lineNumber: number): Record<string, any> {
    // Try to extract timestamp, level, and message from common log formats
    const timestampRegex = /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/;
    const levelRegex = /\[(INFO|DEBUG|WARN|ERROR|SUCCESS|FATAL|TRACE)\]/i;

    const timestampMatch = line.match(timestampRegex);
    const levelMatch = line.match(levelRegex);

    let timestamp = timestampMatch ? timestampMatch[1] : null;
    let level = levelMatch ? levelMatch[1].toUpperCase() : 'INFO';

    // Remove timestamp and level from message if found
    let message = line;
    if (timestampMatch) {
      message = message.replace(timestampMatch[0], '').trim();
    }
    if (levelMatch) {
      message = message.replace(levelMatch[0], '').trim();
    }

    // If no structured format found, treat entire line as message
    if (!timestampMatch && !levelMatch) {
      message = line.trim();
      timestamp = new Date().toISOString();
    }

    return {
      '@timestamp': timestamp || new Date().toISOString(),
      level,
      message: message || line.trim(),
      line_number: lineNumber,
      raw_line: line
    };
  }

  private async processTextContent(text: string, limit?: number): Promise<Array<Record<string, any>>> {
    const lines = text.split('\n');
    const documents: Array<Record<string, any>> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) continue;

      // Apply limit if specified
      if (limit && documents.length >= limit) {
        break;
      }

      const document = this.parseLogLine(line, i + 1);
      if (isValidObject(document)) {
        documents.push(document);
      }
    }

    return documents;
  }

  public async ingestText(text: string, options: IngestOptions) {
    const { client, indexName } = options;
    const documents = await this.processTextContent(text);

    const failedRows: number[] = [];
    let successCount = 0;

    for (let i = 0; i < documents.length; i++) {
      try {
        await client.index({
          index: indexName,
          body: documents[i],
        });
        successCount++;
      } catch (error) {
        failedRows.push(documents[i].line_number);
      }
    }

    return {
      total: documents.length,
      message: `Indexed ${successCount} documents from ${documents.length} lines`,
      failedRows: failedRows.sort((n1, n2) => n1 - n2),
    };
  }

  public async ingestFile(file: Readable, options: IngestOptions) {
    return new Promise<any>((resolve, reject) => {
      let textContent = '';

      file.on('data', (chunk) => {
        textContent += chunk.toString();
      });

      file.on('end', async () => {
        try {
          const result = await this.ingestText(textContent, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      file.on('error', (error) => {
        reject(error);
      });
    });
  }

  public async parseFile(file: Readable, limit: number, options: ParseOptions) {
    return new Promise<Array<Record<string, any>>>((resolve, reject) => {
      let textContent = '';

      file.on('data', (chunk) => {
        textContent += chunk.toString();
      });

      file.on('end', async () => {
        try {
          const documents = await this.processTextContent(textContent, limit);
          resolve(documents);
        } catch (error) {
          reject(error);
        }
      });

      file.on('error', (error) => {
        reject(error);
      });
    });
  }
}