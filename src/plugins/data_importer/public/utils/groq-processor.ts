/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Simple GROQ query processor for filtering JSON documents
 * Supports basic filtering operations like:
 * - *[field == "value"]
 * - *[field match "pattern"]
 * - *[level == "ERROR"]{timestamp, message}
 */

export interface GROQProcessorResult {
  success: boolean;
  data: any[];
  error?: string;
}

export class SimpleGROQProcessor {
  static process(documents: any[], query: string): GROQProcessorResult {
    try {
      if (!query || !query.trim()) {
        return { success: true, data: documents };
      }

      const cleanQuery = query.trim();
      const arrayMatch = cleanQuery.match(/^\*(\[([^\]]+)\])?(\{([^}]+)\})?$/);

      if (!arrayMatch) {
        throw new Error('Invalid GROQ syntax. Use format: *[filter]{projection}');
      }

      const filterExpression = arrayMatch[2];
      const projectionFields = arrayMatch[4];

      let filteredData = documents;

      if (filterExpression) {
        filteredData = this.applyFilter(documents, filterExpression);
      }

      if (projectionFields) {
        filteredData = this.applyProjection(filteredData, projectionFields);
      }

      return { success: true, data: filteredData };
    } catch (error) {
      return {
        success: false,
        data: documents,
        error: error.message || 'Failed to process GROQ query',
      };
    }
  }

  private static applyFilter(documents: any[], filterExpression: string): any[] {
    return documents.filter((doc) => {
      try {
        return this.evaluateFilter(doc, filterExpression);
      } catch (error) {
        return false;
      }
    });
  }

  private static evaluateFilter(doc: any, expression: string): boolean {
    // NEW: Handle AND operator
    if (expression.includes('&&')) {
      const parts = expression.split('&&').map((p) => p.trim());
      return parts.every((part) => this.evaluateFilter(doc, part));
    }

    // NEW: Handle OR operator
    if (expression.includes('||')) {
      const parts = expression.split('||').map((p) => p.trim());
      return parts.some((part) => this.evaluateFilter(doc, part));
    }

    // NEW: Handle null checks
    const nullCheckMatch = expression.match(/^([\w.]+)\s*(!?=)\s*null$/);
    if (nullCheckMatch) {
      const [, fieldPath, operator] = nullCheckMatch;
      const value = this.getNestedValue(doc, fieldPath);
      return operator === '!=' ? value != null : value == null;
    }

    // UPDATED: Support nested properties
    const equalityMatch = expression.match(/^([\w.]+)\s*==\s*(.+)$/);
    if (equalityMatch) {
      const [, fieldPath, value] = equalityMatch;
      const cleanValue = this.cleanValue(value);
      const fieldValue = this.getNestedValue(doc, fieldPath);
      return fieldValue == cleanValue;
    }

    // UPDATED: Match operator with nested support
    const matchMatch = expression.match(/^([\w.]+)\s+match\s+"([^"]+)"$/);
    if (matchMatch) {
      const [, fieldPath, pattern] = matchMatch;
      const fieldValue = String(this.getNestedValue(doc, fieldPath) || '');
      const regexPattern = pattern.replace(/\*/g, '.*');
      return new RegExp(regexPattern, 'i').test(fieldValue);
    }

    // UPDATED: Inequality with nested support
    const inequalityMatch = expression.match(/^([\w.]+)\s*([><=!]+)\s*(.+)$/);
    if (inequalityMatch) {
      const [, fieldPath, operator, value] = inequalityMatch;
      const cleanValue = this.cleanValue(value);
      const fieldValue = this.getNestedValue(doc, fieldPath);

      switch (operator) {
        case '>':
          return fieldValue > cleanValue;
        case '<':
          return fieldValue < cleanValue;
        case '>=':
          return fieldValue >= cleanValue;
        case '<=':
          return fieldValue <= cleanValue;
        case '!=':
          return fieldValue != cleanValue;
        default:
          return false;
      }
    }

    throw new Error(`Unsupported filter expression: ${expression}`);
  }

  // NEW: Get nested property value
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => {
      return current?.[prop];
    }, obj);
  }

  // UPDATED: Support field renaming
  private static applyProjection(documents: any[], projectionFields: string): any[] {
    const fields = projectionFields.split(',').map((f) => f.trim());

    return documents.map((doc) => {
      const projected: any = {};

      fields.forEach((field) => {
        const renameMatch = field.match(/"([^"]+)":\s*(.+)/);

        if (renameMatch) {
          const [, newName, oldPath] = renameMatch;
          projected[newName] = this.getNestedValue(doc, oldPath.trim());
        } else {
          const value = this.getNestedValue(doc, field);
          if (value !== undefined) {
            projected[field] = value;
          }
        }
      });

      return projected;
    });
  }

  private static cleanValue(value: string): any {
    const trimmed = value.trim();

    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }

    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10);
    }

    if (/^\d*\.\d+$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    return trimmed;
  }
}
