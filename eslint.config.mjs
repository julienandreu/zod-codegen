import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Default ignores for consuming projects
const defaultIgnores = ['**/*.mjs', '**/dist/**', '**/coverage/**'];

export default defineConfig([
  {
    ignores: defaultIgnores
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  eslintConfigPrettier,
  {
    files: ['examples/**/*.ts', 'tests/**/*.ts'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      'curly': ['error', 'all'],
      'no-var': 'error',
      'padding-line-between-statements': ['error', { blankLine: 'always', prev: 'if', next: '*' }],
      'prefer-const': [
        'error',
        {
          destructuring: 'all',
          ignoreReadBeforeAssign: false
        }
      ],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true
        }
      ]
    }
  }
]);
