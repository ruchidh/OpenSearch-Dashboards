/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpStart } from '../../../../core/public';
import { PreviewResponse, ImportResponse } from '../types';

export interface FileParserConfig {
  fileExtension: string;
  indexName: string;
  createMode: boolean;
  delimiter?: string;
  selectedDataSourceId?: string;
  previewCount?: number;
  mapping?: any;
}

export interface FileTypeParser {
  canHandle(fileExtension: string): boolean;
  parse(file: File, config: FileParserConfig, http: HttpStart): Promise<PreviewResponse>;
  import(file: File, config: FileParserConfig, http: HttpStart): Promise<ImportResponse>;
}

// Base abstract parser class
abstract class BaseFileParser implements FileTypeParser {
  protected supportedExtensions: string[];

  constructor(supportedExtensions: string[]) {
    this.supportedExtensions = supportedExtensions;
  }

  canHandle(fileExtension: string): boolean {
    return this.supportedExtensions.includes(fileExtension.toLowerCase());
  }

  abstract parse(file: File, config: FileParserConfig, http: HttpStart): Promise<PreviewResponse>;
  abstract import(file: File, config: FileParserConfig, http: HttpStart): Promise<ImportResponse>;
}

// CSV Parser
class CSVParser extends BaseFileParser {
  constructor() {
    super(['.csv']);
  }

  async parse(file: File, config: FileParserConfig, http: HttpStart): Promise<PreviewResponse> {
    const { previewFile } = await import('../lib/preview_file');
    return previewFile({
      http,
      file,
      createMode: config.createMode,
      fileExtension: config.fileExtension,
      indexName: config.indexName,
      previewCount: config.previewCount || 10,
      delimiter: config.delimiter,
      selectedDataSourceId: config.selectedDataSourceId,
    });
  }

  async import(file: File, config: FileParserConfig, http: HttpStart): Promise<ImportResponse> {
    const { importFile } = await import('../lib/import_file');
    return importFile({
      http,
      file,
      indexName: config.indexName,
      createMode: config.createMode,
      fileExtension: config.fileExtension,
      delimiter: config.delimiter,
      selectedDataSourceId: config.selectedDataSourceId,
      mapping: config.mapping,
    });
  }
}

// JSON Parser
class JSONParser extends BaseFileParser {
  constructor() {
    super(['.json', '.ndjson']);
  }

  async parse(file: File, config: FileParserConfig, http: HttpStart): Promise<PreviewResponse> {
    const { previewFile } = await import('../lib/preview_file');
    return previewFile({
      http,
      file,
      createMode: config.createMode,
      fileExtension: config.fileExtension,
      indexName: config.indexName,
      previewCount: config.previewCount || 10,
      selectedDataSourceId: config.selectedDataSourceId,
    });
  }

  async import(file: File, config: FileParserConfig, http: HttpStart): Promise<ImportResponse> {
    const { importFile } = await import('../lib/import_file');
    return importFile({
      http,
      file,
      indexName: config.indexName,
      createMode: config.createMode,
      fileExtension: config.fileExtension,
      selectedDataSourceId: config.selectedDataSourceId,
      mapping: config.mapping,
    });
  }
}

// TXT Parser
class TXTParser extends BaseFileParser {
  constructor() {
    super(['.txt']);
  }

  async parse(file: File, config: FileParserConfig, http: HttpStart): Promise<PreviewResponse> {
    const { previewFile } = await import('../lib/preview_file');
    return previewFile({
      http,
      file,
      createMode: config.createMode,
      fileExtension: config.fileExtension,
      indexName: config.indexName,
      previewCount: config.previewCount || 10,
      selectedDataSourceId: config.selectedDataSourceId,
    });
  }

  async import(file: File, config: FileParserConfig, http: HttpStart): Promise<ImportResponse> {
    const { importFile } = await import('../lib/import_file');
    return importFile({
      http,
      file,
      indexName: config.indexName,
      createMode: config.createMode,
      fileExtension: config.fileExtension,
      selectedDataSourceId: config.selectedDataSourceId,
      mapping: config.mapping,
    });
  }
}

// HAR Parser
class HARParser extends BaseFileParser {
  constructor() {
    super(['.har']);
  }

  async parse(file: File, config: FileParserConfig, http: HttpStart): Promise<PreviewResponse> {
    const { previewFile } = await import('../lib/preview_file');
    return previewFile({
      http,
      file,
      createMode: config.createMode,
      fileExtension: config.fileExtension,
      indexName: config.indexName,
      previewCount: config.previewCount || 10,
      selectedDataSourceId: config.selectedDataSourceId,
    });
  }

  async import(file: File, config: FileParserConfig, http: HttpStart): Promise<ImportResponse> {
    const { importFile } = await import('../lib/import_file');
    return importFile({
      http,
      file,
      indexName: config.indexName,
      createMode: config.createMode,
      fileExtension: config.fileExtension,
      selectedDataSourceId: config.selectedDataSourceId,
      mapping: config.mapping,
    });
  }
}

// GROQ Parser - Custom parser for GROQ files
class GROQParser extends BaseFileParser {
  constructor() {
    super(['.groq']);
  }

  async parse(file: File, config: FileParserConfig, http: HttpStart): Promise<PreviewResponse> {
    // For GROQ files, we might need special handling
    // For now, treat as text/json until specific GROQ parsing is implemented
    const { previewFile } = await import('../lib/preview_file');
    return previewFile({
      http,
      file,
      createMode: config.createMode,
      fileExtension: '.json', // Treat as JSON for now
      indexName: config.indexName,
      previewCount: config.previewCount || 10,
      selectedDataSourceId: config.selectedDataSourceId,
    });
  }

  async import(file: File, config: FileParserConfig, http: HttpStart): Promise<ImportResponse> {
    const { importFile } = await import('../lib/import_file');
    return importFile({
      http,
      file,
      indexName: config.indexName,
      createMode: config.createMode,
      fileExtension: '.json', // Treat as JSON for now
      selectedDataSourceId: config.selectedDataSourceId,
      mapping: config.mapping,
    });
  }
}

// File Parser Service - Main service class
export class FileParserService {
  private parsers: FileTypeParser[] = [];

  constructor() {
    this.registerDefaultParsers();
  }

  private registerDefaultParsers() {
    this.parsers.push(
      new CSVParser(),
      new JSONParser(),
      new TXTParser(),
      new HARParser(),
      new GROQParser()
    );
  }

  // Method to register new parsers - allows for extensibility
  registerParser(parser: FileTypeParser): void {
    this.parsers.push(parser);
  }

  // Get the appropriate parser for a file extension
  getParser(fileExtension: string): FileTypeParser | null {
    return this.parsers.find(parser => parser.canHandle(fileExtension)) || null;
  }

  // Parse a file
  async parseFile(file: File, config: FileParserConfig, http: HttpStart): Promise<PreviewResponse> {
    const parser = this.getParser(config.fileExtension);
    if (!parser) {
      throw new Error(`Unsupported file type: ${config.fileExtension}`);
    }
    return parser.parse(file, config, http);
  }

  // Import a file
  async importFile(file: File, config: FileParserConfig, http: HttpStart): Promise<ImportResponse> {
    const parser = this.getParser(config.fileExtension);
    if (!parser) {
      throw new Error(`Unsupported file type: ${config.fileExtension}`);
    }
    return parser.import(file, config, http);
  }

  // Get supported file extensions
  getSupportedExtensions(): string[] {
    const extensions = new Set<string>();
    this.parsers.forEach(parser => {
      if (parser instanceof BaseFileParser) {
        (parser as any).supportedExtensions.forEach((ext: string) => extensions.add(ext));
      }
    });
    return Array.from(extensions);
  }

  // Helper method to create file from text input
  createFileFromText(textInput: string, fileType: string): File {
    const getFileExtension = (fileType: string) => {
      switch (fileType) {
        case 'json':
          return '.json';
        case 'csv':
          return '.csv';
        case 'ndjson':
          return '.ndjson';
        case 'txt':
          return '.txt';
        case 'groq':
          return '.groq';
        default:
          return '.json';
      }
    };

    const getMimeType = (fileType: string) => {
      switch (fileType) {
        case 'json':
          return 'application/json';
        case 'csv':
          return 'text/csv';
        case 'ndjson':
          return 'application/x-ndjson';
        case 'txt':
          return 'text/plain';
        case 'groq':
          return 'application/json'; // Treat as JSON for now
        default:
          return 'application/json';
      }
    };

    const fileExtension = getFileExtension(fileType);
    const mimeType = getMimeType(fileType);

    const blob = new Blob([textInput], { type: mimeType });
    return new File([blob], `text_input${fileExtension}`, { type: mimeType });
  }
}

// Singleton instance
export const fileParserService = new FileParserService();