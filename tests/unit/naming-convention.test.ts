import {describe, expect, it} from 'vitest';
import {NamingConventionTransformer, type NamingConvention} from '../../src/utils/naming-convention.js';

describe('NamingConventionTransformer', () => {
  describe('transform', () => {
    const testCases: Array<{
      input: string;
      convention: NamingConvention;
      expected: string;
      description: string;
    }> = [
      // camelCase
      {
        input: 'get_user_by_id',
        convention: 'camelCase',
        expected: 'getUserById',
        description: 'should convert snake_case to camelCase',
      },
      {
        input: 'GetUserById',
        convention: 'camelCase',
        expected: 'getUserById',
        description: 'should convert PascalCase to camelCase',
      },
      {
        input: 'get-user-by-id',
        convention: 'camelCase',
        expected: 'getUserById',
        description: 'should convert kebab-case to camelCase',
      },
      {
        input: 'getUserById',
        convention: 'camelCase',
        expected: 'getUserById',
        description: 'should keep camelCase as camelCase',
      },

      // PascalCase
      {
        input: 'get_user_by_id',
        convention: 'PascalCase',
        expected: 'GetUserById',
        description: 'should convert snake_case to PascalCase',
      },
      {
        input: 'get-user-by-id',
        convention: 'PascalCase',
        expected: 'GetUserById',
        description: 'should convert kebab-case to PascalCase',
      },
      {
        input: 'getUserById',
        convention: 'PascalCase',
        expected: 'GetUserById',
        description: 'should convert camelCase to PascalCase',
      },

      // snake_case
      {
        input: 'getUserById',
        convention: 'snake_case',
        expected: 'get_user_by_id',
        description: 'should convert camelCase to snake_case',
      },
      {
        input: 'GetUserById',
        convention: 'snake_case',
        expected: 'get_user_by_id',
        description: 'should convert PascalCase to snake_case',
      },
      {
        input: 'get-user-by-id',
        convention: 'snake_case',
        expected: 'get_user_by_id',
        description: 'should convert kebab-case to snake_case',
      },

      // kebab-case
      {
        input: 'getUserById',
        convention: 'kebab-case',
        expected: 'get-user-by-id',
        description: 'should convert camelCase to kebab-case',
      },
      {
        input: 'GetUserById',
        convention: 'kebab-case',
        expected: 'get-user-by-id',
        description: 'should convert PascalCase to kebab-case',
      },
      {
        input: 'get_user_by_id',
        convention: 'kebab-case',
        expected: 'get-user-by-id',
        description: 'should convert snake_case to kebab-case',
      },

      // SCREAMING_SNAKE_CASE
      {
        input: 'getUserById',
        convention: 'SCREAMING_SNAKE_CASE',
        expected: 'GET_USER_BY_ID',
        description: 'should convert camelCase to SCREAMING_SNAKE_CASE',
      },
      {
        input: 'get-user-by-id',
        convention: 'SCREAMING_SNAKE_CASE',
        expected: 'GET_USER_BY_ID',
        description: 'should convert kebab-case to SCREAMING_SNAKE_CASE',
      },

      // SCREAMING-KEBAB-CASE
      {
        input: 'getUserById',
        convention: 'SCREAMING-KEBAB-CASE',
        expected: 'GET-USER-BY-ID',
        description: 'should convert camelCase to SCREAMING-KEBAB-CASE',
      },
      {
        input: 'get_user_by_id',
        convention: 'SCREAMING-KEBAB-CASE',
        expected: 'GET-USER-BY-ID',
        description: 'should convert snake_case to SCREAMING-KEBAB-CASE',
      },

      // Edge cases
      {
        input: '',
        convention: 'camelCase',
        expected: '',
        description: 'should handle empty string',
      },
      {
        input: 'a',
        convention: 'camelCase',
        expected: 'a',
        description: 'should handle single character',
      },
      {
        input: 'API',
        convention: 'camelCase',
        expected: 'aPI',
        description: 'should handle all uppercase (splits at uppercase boundaries)',
      },
      {
        input: 'getUser123ById',
        convention: 'snake_case',
        expected: 'get_user_123_by_id',
        description: 'should handle numbers in identifiers (splits at digit boundaries)',
      },
    ];

    testCases.forEach(({input, convention, expected, description}) => {
      it(description, () => {
        const result = NamingConventionTransformer.transform(input, convention);
        expect(result).toBe(expected);
      });
    });
  });
});
