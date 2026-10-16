import type { DatabaseHandle } from './client.js';

/* The one raw statement outside a query: `select 1` answers liveness, where a
 * Drizzle query would ask about the schema. It throws for the caller's try. */
export function pingDatabase(database: DatabaseHandle): void {
  database.sqlite.prepare('select 1').get();
}
