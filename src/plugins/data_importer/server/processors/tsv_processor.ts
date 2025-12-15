/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Readable } from 'stream';
import { IFileProcessor, IngestOptions, ParseOptions, ValidationOptions } from '../types';
import { CSVProcessor } from './csv_processor';

export class TSVProcessor implements IFileProcessor {
  private csvProcessor: CSVProcessor;

  constructor() {
    this.csvProcessor = new CSVProcessor();
  }

  public async validateText(text: string, options: ValidationOptions) {
    // Check if the text contains tab characters, which indicates TSV format
    if (text.includes('\t')) {
      return this.csvProcessor.validateText(text, options);
    }
    return false;
  }

  public async ingestText(text: string, options: IngestOptions) {
    // Use CSV processor with tab delimiter
    const modifiedOptions = {
      ...options,
      delimiter: '\t',
    };
    return this.csvProcessor.ingestText(text, modifiedOptions);
  }

  public async ingestFile(file: Readable, options: IngestOptions) {
    // Use CSV processor with tab delimiter
    const modifiedOptions = {
      ...options,
      delimiter: '\t',
    };
    return this.csvProcessor.ingestFile(file, modifiedOptions);
  }

  public async parseFile(file: Readable, limit: number, options: ParseOptions) {
    // Use CSV processor with tab delimiter for parsing
    const modifiedOptions = {
      ...options,
      delimiter: '\t',
    };
    return this.csvProcessor.parseFile(file, limit, modifiedOptions);
  }
}