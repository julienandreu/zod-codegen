/**
 * Supported naming conventions for operation IDs.
 * These conventions transform operation IDs to match common programming language styles.
 *
 * @example
 * ```typescript
 * transformNamingConvention('get_user_by_id', 'camelCase') // 'getUserById'
 * transformNamingConvention('getUserById', 'snake_case') // 'get_user_by_id'
 * ```
 */
export type NamingConvention =
  | 'camelCase'
  | 'PascalCase'
  | 'snake_case'
  | 'kebab-case'
  | 'SCREAMING_SNAKE_CASE'
  | 'SCREAMING-KEBAB-CASE';

/**
 * Operation details provided to custom transformers.
 * Contains all available information about an OpenAPI operation.
 *
 * @example
 * ```typescript
 * const transformer: OperationNameTransformer = (details) => {
 *   return `${details.method.toUpperCase()}_${details.operationId}`;
 * };
 * ```
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
 * Custom transformer function for operation names.
 * Receives operation details and returns the transformed name.
 *
 * **Note:** The returned name will be sanitized to ensure it's a valid TypeScript identifier.
 * Invalid characters will be replaced with underscores, and names starting with digits will be prefixed.
 *
 * @param details - Complete operation details from OpenAPI spec
 * @returns The transformed operation name
 *
 * @example
 * ```typescript
 * const transformer: OperationNameTransformer = (details) => {
 *   const tag = details.tags?.[0] || 'default';
 *   return `${details.method}_${tag}_${details.operationId}`;
 * };
 * ```
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
  let words = input.split(/[-_\s.]+/).filter((w) => w.length > 0);

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
 * Transforms a string to the specified naming convention.
 *
 * Handles various input formats including camelCase, PascalCase, snake_case, kebab-case,
 * and mixed delimiters. The function normalizes the input by splitting on common delimiters
 * (underscores, hyphens, spaces, dots) and then applies the target convention.
 *
 * **Note:** This function does not sanitize the output. The caller should ensure the result
 * is a valid identifier for the target language (e.g., using `sanitizeIdentifier`).
 *
 * @param input - The input string to transform (can be in any naming convention)
 * @param convention - The target naming convention to apply
 * @returns The transformed string in the target convention
 *
 * @example
 * ```typescript
 * transformNamingConvention('get_user_by_id', 'camelCase') // 'getUserById'
 * transformNamingConvention('getUserById', 'snake_case') // 'get_user_by_id'
 * transformNamingConvention('get-user-by-id', 'PascalCase') // 'GetUserById'
 * ```
 *
 * @throws Will return empty string if input is empty (preserves empty input)
 */
export function transformNamingConvention(input: string, convention: NamingConvention): string {
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
  }
}
