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
    /*
     * Raw SQL stays in the database module and in the access rules. The schema is
     * the one description of the storage, so a hand-written statement anywhere
     * else is a second description that no migration and no type checks against,
     * and the two access queries written out in three features are what that cost.
     *
     * A selector rather than no-restricted-properties, because the call is
     * `database.sqlite.prepare`, where the object is a member expression and not
     * a name. The property rule would have matched a local variable called sqlite
     * in a test and missed every real call in the app.
     *
     * Dependency-cruiser cannot enforce this: a `.prepare()` call is a member
     * expression, not an import.
     */
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
    // The driver itself. Creating the connection and running migrations is the
    // whole job here, and the readiness probe's `select 1` is the cheapest true
    // statement there is.
    files: ['apps/server/src/platform/database/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' }
  },
  {
    // shared/access holds the only two hand-written statements in the app. Both
    // answer a correlated question about shares that the query builder cannot
    // express without a join returning a nullable level, and both are the one
    // access rule.
    files: ['apps/server/src/shared/access/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' }
  },
  {
    // A test may reach for the driver to build a state no service produces, and to
    // observe what a service asked the database. Neither is a second description
    // of the schema, and forbidding it in tests would only move the raw SQL
    // somewhere less obvious.
    files: ['apps/server/src/**/*.test.ts'],
    rules: { 'no-restricted-syntax': 'off' }
  },
  {
    /*
     * The web client owns every sentence a person reads through
     * `@playliberty/i18n`, so a hardcoded user-facing string in JSX or in a
     * label prop is copy a second language would leave in English. The rule's
     * allowlist covers the symbols, entities and example URLs that are not copy.
     */
    files: ['apps/web/src/**/*.tsx'],
    plugins: { local: localPlugin },
    rules: { 'local/no-hardcoded-string': 'error' }
  },
  {
    // A test renders fixtures and asserts the copy the app would render, so its
    // strings are the assertion rather than copy the catalog should own.
    files: ['apps/web/src/**/*.test.tsx'],
    rules: { 'local/no-hardcoded-string': 'off' }
  }
]);
