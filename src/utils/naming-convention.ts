/**
 * Supported naming conventions for operation IDs
 */
export type NamingConvention =
  | 'camelCase'
  | 'PascalCase'
  | 'snake_case'
  | 'kebab-case'
  | 'SCREAMING_SNAKE_CASE'
  | 'SCREAMING-KEBAB-CASE';

/**
 * Operation details for custom transformers
 */
export interface OperationDetails {
  /** Original operationId from OpenAPI spec */
  operationId: string;
  /** HTTP method (get, post, put, patch, delete, head, options) */
  method: string;
  /** API path (e.g., /users/{id}) */
  path: string;
  /** Tags associated with the operation */
  tags?: string[];
  /** Summary of the operation */
  summary?: string;
  /** Description of the operation */
  description?: string;
}

/**
 * Custom transformer function for operation names
 * Receives operation details and returns the transformed name
 */
export type OperationNameTransformer = (details: OperationDetails) => string;

/**
 * Capitalizes the first letter of a word
 */
function capitalize(word: string): string {
  if (word.length === 0) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Splits camelCase or PascalCase strings into words
 */
function splitCamelCase(input: string): string[] {
  const words: string[] = [];
  let currentWord = '';

  for (const char of input) {
    if (!char) continue;

    const isUpperCase = char === char.toUpperCase() && char !== char.toLowerCase();
    const isDigit = /\d/.test(char);
    const lastChar = currentWord[currentWord.length - 1];

    // Start a new word if:
    // 1. Current char is uppercase and we have a previous word
    // 2. Current char is a digit and previous was not
    if (currentWord.length > 0 && (isUpperCase || (isDigit && lastChar && !/\d/.test(lastChar)))) {
      words.push(currentWord);
      currentWord = '';
    }

    currentWord += char;
  }

  if (currentWord.length > 0) {
    words.push(currentWord);
  }

  return words.length > 0 ? words : [input];
}

/**
 * Normalizes input string into an array of words
 * Handles camelCase, PascalCase, snake_case, kebab-case, SCREAMING_SNAKE_CASE, etc.
 */
function normalizeToWords(input: string): string[] {
  // Handle empty or single character
  if (input.length <= 1) {
    return [input.toLowerCase()];
  }

  // Split by common delimiters: underscore, hyphen, space, dot
  let words = input.split(/[_\-\s.]+/).filter((w) => w.length > 0);

  // If no delimiters found, try to split camelCase/PascalCase
  if (words.length === 1) {
    words = splitCamelCase(input);
  }

  // Normalize all words to lowercase
  return words.map((w) => w.toLowerCase());
}

/**
 * Converts words array to camelCase
 */
function toCamelCase(words: string[]): string {
  if (words.length === 0) return '';
  const [first, ...rest] = words;
  if (!first) return '';
  return first + rest.map((w) => capitalize(w)).join('');
}

/**
 * Converts words array to PascalCase
 */
function toPascalCase(words: string[]): string {
  return words.map((w) => capitalize(w)).join('');
}

/**
 * Converts words array to snake_case
 */
function toSnakeCase(words: string[]): string {
  return words.join('_');
}

/**
 * Converts words array to kebab-case
 */
function toKebabCase(words: string[]): string {
  return words.join('-');
}

/**
 * Converts words array to SCREAMING_SNAKE_CASE
 */
function toScreamingSnakeCase(words: string[]): string {
  return words.map((w) => w.toUpperCase()).join('_');
}

/**
 * Converts words array to SCREAMING-KEBAB-CASE
 */
function toScreamingKebabCase(words: string[]): string {
  return words.map((w) => w.toUpperCase()).join('-');
}

/**
 * Naming convention transformer functions
 */
export const NamingConventionTransformer = {
  /**
   * Transforms a string to the specified naming convention
   */
  transform(input: string, convention: NamingConvention): string {
    if (!input || input.length === 0) {
      return input;
    }

    // Normalize input: split by common delimiters and convert to words
    const words = normalizeToWords(input);

    switch (convention) {
      case 'camelCase':
        return toCamelCase(words);
      case 'PascalCase':
        return toPascalCase(words);
      case 'snake_case':
        return toSnakeCase(words);
      case 'kebab-case':
        return toKebabCase(words);
      case 'SCREAMING_SNAKE_CASE':
        return toScreamingSnakeCase(words);
      case 'SCREAMING-KEBAB-CASE':
        return toScreamingKebabCase(words);
      default:
        return input;
    }
  },
};
