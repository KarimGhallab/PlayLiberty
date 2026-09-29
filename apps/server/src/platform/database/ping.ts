import type { DatabaseHandle } from './client.js';

/*
 * Whether the database answers.
 *
 * It lives here rather than in the readiness check because it is the one raw
 * statement the app is allowed to make outside a query, and the reason is that
 * there is nothing to ask about. A readiness probe wants to know the connection
 * works, and `select 1` is the cheapest statement that says so; a Drizzle query
 * here would be a query against a table, which turns a liveness question into a
 * question about the schema.
 *
 * It throws rather than returning a boolean, so the caller's existing try block
 * reports the driver error with its own message, which is the one worth logging.
 */
export function pingDatabase(database: DatabaseHandle): void {
  database.sqlite.prepare('select 1').get();
}
