import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import type { DatabaseHandle } from './client.js';

export function runMigrations(handle: DatabaseHandle): void {
  // Resolved from import.meta.url, so the depth is the compiled file's depth, not
  // the source's: this compiles to dist/platform/database/migrate.js and has to
  // climb three levels to reach the app's drizzle folder. Reading the path from
  // config instead would put the migrations inside the database module, where
  // drizzle-kit also expects to find them, and drizzle.config.ts points at this
  // one folder for both.
  const migrationsFolder = fileURLToPath(
    new URL('../../../drizzle', import.meta.url)
  );
  migrate(handle.db, { migrationsFolder });
}
