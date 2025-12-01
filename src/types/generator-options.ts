import type {NamingConvention, OperationNameTransformer} from '../utils/naming-convention.js';

/**
 * Options for the Generator class
 */
export interface GeneratorOptions {
  /**
   * Naming convention to apply to operation IDs
   * If provided, will transform operation IDs according to the specified convention
   */
  namingConvention?: NamingConvention;

  /**
   * Custom transformer function for operation names
   * If provided, this takes precedence over namingConvention
   * Receives operation details and returns the transformed name
   */
  operationNameTransformer?: OperationNameTransformer;
}
