import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    files: ['src/**/__tests__/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '**/*.js'],
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/providers/**', 'src/platforms/**'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: '@actions/github', message: 'Platform SDKs belong in src/providers/ or src/platforms/ only. See spec 4.2 (backend parity).' }
        ],
        patterns: [
          { group: ['@octokit/*'], message: 'Platform SDKs belong in src/providers/ or src/platforms/ only. See spec 4.2 (backend parity).' }
        ]
      }]
    }
  }
];

