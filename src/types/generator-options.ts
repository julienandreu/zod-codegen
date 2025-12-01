import type {NamingConvention, OperationNameTransformer} from '../utils/naming-convention.js';

/**
 * Configuration options for the Generator class.
 *
 * These options control how operation IDs are transformed during code generation.
 * You can either use a predefined naming convention or provide a custom transformer function.
 *
 * @example
 * ```typescript
 * // Using a naming convention
 * const generator = new Generator(..., {
 *   namingConvention: 'camelCase'
 * });
 *
 * // Using a custom transformer
 * const generator = new Generator(..., {
 *   operationNameTransformer: (details) => {
 *     return `${details.method}_${details.operationId}`;
 *   }
 * });
 * ```
 */
export interface GeneratorOptions {
  /**
   * Naming convention to apply to operation IDs.
   *
   * If provided, all operation IDs will be transformed according to the specified convention.
   * This is useful when OpenAPI specs have inconsistent or poorly named operation IDs.
   *
   * **Note:** If `operationNameTransformer` is also provided, it takes precedence.
   *
   * @example
   * ```typescript
   * { namingConvention: 'camelCase' } // Transforms 'get_user_by_id' → 'getUserById'
   * ```
   */
  namingConvention?: NamingConvention;

  /**
   * Custom transformer function for operation names.
   *
   * If provided, this function will be called for each operation with full operation details.
   * This allows for advanced customization based on HTTP method, path, tags, etc.
   *
   * **Note:** This takes precedence over `namingConvention` if both are provided.
   * The returned name will be sanitized to ensure it's a valid TypeScript identifier.
   *
   * @example
   * ```typescript
   * {
   *   operationNameTransformer: (details) => {
   *     const tag = details.tags?.[0] || 'default';
   *     return `${details.method.toUpperCase()}_${tag}_${details.operationId}`;
   *   }
   * }
   * ```
   */
  operationNameTransformer?: OperationNameTransformer;
}
