import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { DatabaseHandle } from '../client.js';
import { createDatabase } from '../client.js';
import { runMigrations } from './migrate.js';

let directory: string | undefined;

afterEach(async () => {
  if (directory !== undefined) {
    await rm(directory, { recursive: true, force: true });
    directory = undefined;
  }
});

function names(database: DatabaseHandle, query: string): string[] {
  return (database.sqlite.prepare(query).all() as { name: string }[]).map(
    row => row.name
  );
}

/*
 * The migrations are one committed folder the server applies at startup, and
 * runMigrations resolves it from the compiled file's depth rather than from
 * config. This is the one test that proves the folder is found and applied: it
 * starts from an empty database, runs the real migrator, and checks the schema
 * the initial migration carries.
 *
 * There is a single migration because the app is not live and the history was
 * squashed, so there is no earlier state to migrate from and no backfill to
 * exercise. The columns the squashed history had added one at a time are still
 * asserted, because that is what proves the squash kept the whole schema rather
 * than the first draft.
 */
describe('runMigrations', () => {
  it('applies the initial migration to an empty database', async () => {
    const root = await mkdtemp(join(tmpdir(), 'playliberty-migration-'));
    directory = root;

    const database = createDatabase(join(root, 'playliberty.db'));
    runMigrations(database);

    const tables = names(
      database,
      `select name from sqlite_master where type = 'table' order by name`
    ).filter(
      name => !name.startsWith('sqlite_') && !name.startsWith('__drizzle')
    );

    expect(tables).toEqual([
      'account',
      'association',
      'playlist',
      'share',
      'suppression',
      'sync_run',
      'track'
    ]);

    // The columns the squashed history had added one migration at a time.
    expect(
      names(database, `select name from pragma_table_info('playlist')`)
    ).toEqual(
      expect.arrayContaining(['source_url', 'skip_non_music', 'track_count'])
    );
    expect(
      names(database, `select name from pragma_table_info('track')`)
    ).toEqual(expect.arrayContaining(['skip_non_music', 'thumbnail_url']));

    database.sqlite.close();
  });
});
