import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema.js';

export interface DatabaseHandle {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
}

export function createDatabase(databasePath: string): DatabaseHandle {
  const sqlite = new Database(databasePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('synchronous = NORMAL');

  const db = drizzle(sqlite, { schema });

  return { sqlite, db };
}
