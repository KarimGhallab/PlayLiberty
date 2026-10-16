import pluginJs from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import noHardcodedString from './eslint-rules/no-hardcoded-string.js';

const localPlugin = {
  rules: {
    'no-hardcoded-string': noHardcodedString
  }
};

export default defineConfig([
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.js', '**/*.cjs']
  },
  pluginJs.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{mjs,cjs,ts}'],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      curly: ['error', 'all']
    }
  },
  {
    // Raw SQL stays in the database module and the access rules; a selector,
    // because `db.sqlite.prepare()` is a member expression, not an import.
    files: ['apps/server/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='prepare']",
          message:
            'Raw SQL belongs in platform/database or shared/access. Everywhere else goes through Drizzle, so the schema stays the one description of the storage.'
        }
      ]
    }
  },
  {
    // The driver itself: the connection, the migrations, the readiness probe.
    files: ['apps/server/src/platform/database/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' }
  },
  {
    // The only two hand-written statements in the app: a correlated question
    // about shares the query builder cannot express without a nullable join.
    files: ['apps/server/src/shared/access/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' }
  },
  {
    // A test may drive the database directly, to build a state no service
    // produces or to observe what a service asked. That is not the schema.
    files: ['apps/server/src/**/*.test.ts'],
    rules: { 'no-restricted-syntax': 'off' }
  },
  {
    files: ['apps/web/src/**/*.tsx'],
    plugins: { local: localPlugin },
    rules: { 'local/no-hardcoded-string': 'error' }
  },
  {
    // A test's strings are its assertion, not copy the catalog owns.
    files: ['apps/web/src/**/*.test.tsx'],
    rules: { 'local/no-hardcoded-string': 'off' }
  }
]);
