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

/* The migrations are one folder the server applies at startup, found from the
 * compiled file's depth. From empty, it asserts the whole schema it leaves. */
describe('runMigrations', () => {
  it('applies the migrations to an empty database', async () => {
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
      'egress_config',
      'playlist',
      'playlist_pin',
      'share',
      'suppression',
      'sync_run',
      'track'
    ]);

    expect(
      names(database, `select name from pragma_table_info('playlist')`)
    ).toEqual(
      expect.arrayContaining([
        'source_url',
        'skip_non_music',
        'track_count',
        'cover_path',
        'cover_updated_at'
      ])
    );
    expect(
      names(database, `select name from pragma_table_info('track')`)
    ).toEqual(expect.arrayContaining(['skip_non_music', 'thumbnail_url']));

    database.sqlite.close();
  });
});
