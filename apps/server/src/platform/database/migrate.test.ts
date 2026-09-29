import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AssociationOrigin,
  Provider,
  TrackFileStatus,
  UserRole
} from '@playliberty/contracts';

import { createDatabase } from './client.js';
import type { DatabaseHandle } from './client.js';
import { runMigrations } from './migrate.js';

const NOW = '2026-09-28T10:00:00.000Z';

let directory: string | undefined;

afterEach(async () => {
  if (directory !== undefined) {
    await rm(directory, { recursive: true, force: true });
    directory = undefined;
  }
});

// Three levels, because vitest runs the source file from src/platform/database/
// while runMigrations resolves against the compiled dist/platform/database/. Both
// land on the app's drizzle folder, and the test copying from the wrong one would
// pass while the server failed to boot.
const MIGRATIONS = new URL('../../../drizzle/', import.meta.url);

/*
 * drizzle-kit generates DDL and knows nothing about existing rows, so the
 * backfill in 0001 is hand written and therefore the one part of this ticket with
 * no other coverage: every other test starts from an empty database, where the
 * backfill has nothing to do and would pass whatever it said.
 *
 * So this builds a database at the state before 0001, gives it playlists that
 * already have associations, and then lets the real migrator apply 0001 to it. The
 * earlier SQL files are copied byte for byte, because the migrator identifies an
 * applied migration by the hash of its SQL and a reformatted copy would look
 * unapplied and be run twice.
 */
async function databaseAtMigration(count: number): Promise<DatabaseHandle> {
  const root = await mkdtemp(join(tmpdir(), 'playliberty-migration-'));
  directory = root;
  await mkdir(join(root, 'meta'), { recursive: true });

  const tags = (await readdir(MIGRATIONS))
    .filter(name => name.endsWith('.sql'))
    .sort()
    .map(name => name.replace(/\.sql$/, ''))
    .slice(0, count);

  const journal = JSON.parse(
    await readFile(new URL('meta/_journal.json', MIGRATIONS), 'utf8')
  ) as {
    version: string;
    dialect: string;
    entries: { idx: number; version: string; when: number; tag: string }[];
  };

  // The migrator reads the journal from meta/ inside the folder it is given, not
  // from the folder's root, so the temporary copy has to have the same shape.
  await writeFile(
    join(root, 'meta', '_journal.json'),
    JSON.stringify({
      version: journal.version,
      dialect: journal.dialect,
      entries: journal.entries.filter(entry => tags.includes(entry.tag))
    })
  );

  for (const tag of tags) {
    await writeFile(
      join(root, `${tag}.sql`),
      await readFile(new URL(`${tag}.sql`, MIGRATIONS), 'utf8')
    );
  }

  const database = createDatabase(join(root, 'playliberty.db'));
  migrate(database.db, { migrationsFolder: root });

  return database;
}

function playlistColumns(database: DatabaseHandle): string[] {
  return (
    database.sqlite
      .prepare(`select name from pragma_table_info('playlist')`)
      .all() as {
      name: string;
    }[]
  ).map(column => column.name);
}

describe('the track_count migration', () => {
  it('backfills existing playlists from the associations they already hold', async () => {
    const database = await databaseAtMigration(1);

    // The seed is raw SQL on purpose. The Drizzle schema object describes the
    // database after 0001, and using it to write to a database that has not had
    // 0001 applied is asking the object to describe a table that is not there.
    // Raw statements also keep this test independent of later schema changes,
    // which is the property a migration test needs.
    database.sqlite
      .prepare(
        `insert into account
           (id, pangolin_user_id, display_name, email, avatar_url, role, created_at, updated_at)
         values (?, ?, ?, null, null, ?, ?, ?)`
      )
      .run('account-1', 'pangolin-1', 'One', UserRole.User, NOW, NOW);

    const insertPlaylist = database.sqlite.prepare(
      `insert into playlist
         (id, owner_account_id, name, cover_url, provider, source_playlist_id,
          sync_status, last_synced_at, created_at, updated_at)
       values (?, 'account-1', ?, null, ?, ?, 'idle', null, ?, ?)`
    );
    insertPlaylist.run(
      'playlist-busy',
      'Busy',
      Provider.Youtube,
      'source-busy',
      NOW,
      NOW
    );
    insertPlaylist.run(
      'playlist-empty',
      'Empty',
      Provider.Youtube,
      'source-empty',
      NOW,
      NOW
    );

    const insertTrack = database.sqlite.prepare(
      `insert into track
         (id, provider, video_id, title, duration_seconds, thumbnail_path,
          file_status, source_status, file_path, failure_reason, created_at, updated_at)
       values (?, ?, ?, 'Track', null, null, ?, 'available', null, null, ?, ?)`
    );
    const insertAssociation = database.sqlite.prepare(
      `insert into association (id, playlist_id, track_id, origin, position, added_at)
       values (?, 'playlist-busy', ?, ?, ?, ?)`
    );

    for (const [position, trackId] of ['track-1', 'track-2'].entries()) {
      insertTrack.run(
        trackId,
        Provider.Youtube,
        `video-${trackId}`,
        TrackFileStatus.Stored,
        NOW,
        NOW
      );
      insertAssociation.run(
        `association-${trackId}`,
        trackId,
        AssociationOrigin.Remote,
        position,
        NOW
      );
    }

    // The column does not exist yet. A backfill that "passed" against a schema
    // that already had it would be proving nothing.
    expect(playlistColumns(database)).not.toContain('track_count');

    runMigrations(database);

    expect(playlistColumns(database)).toContain('track_count');

    const rows = database.sqlite
      .prepare(`select id, track_count from playlist order by id`)
      .all() as { id: string; track_count: number }[];

    expect(rows).toEqual([
      { id: 'playlist-busy', track_count: 2 },
      { id: 'playlist-empty', track_count: 0 }
    ]);

    database.sqlite.close();
  });
});
