import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import type { DatabaseHandle } from './client.js';

export function runMigrations(handle: DatabaseHandle): void {
  const migrationsFolder = fileURLToPath(
    new URL('../../drizzle', import.meta.url)
  );
  migrate(handle.db, { migrationsFolder });
}
