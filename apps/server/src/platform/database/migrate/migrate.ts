import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import type { DatabaseHandle } from '../client.js';

export function runMigrations(handle: DatabaseHandle): void {
  // Resolved from import.meta.url, so the depth is the compiled file's, not the
  // source's: it climbs three levels to the app's drizzle folder.
  const migrationsFolder = fileURLToPath(
    new URL('../../../../drizzle', import.meta.url)
  );
  migrate(handle.db, { migrationsFolder });
}
