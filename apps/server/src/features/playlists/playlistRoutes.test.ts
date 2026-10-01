import { randomUUID } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AssociationOrigin,
  PlaylistSchema,
  PlaylistSyncStatus,
  PlaylistTrackSchema,
  Provider,
  ShareLevel,
  TrackFileStatus,
  TrackSourceStatus,
  UserRole,
  createPageSchema
} from '@playliberty/contracts';

import type { TestContext } from '../../app/testing/createTestContext.js';
import { createTestContext } from '../../app/testing/createTestContext.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import {
  accounts,
  playlists,
  shares,
  tracks
} from '../../platform/database/schema.js';
import { addAssociation, removeAssociation } from './associationService.js';

const PageSchema = createPageSchema(PlaylistSchema);
const PlaylistTrackPageSchema = createPageSchema(PlaylistTrackSchema);

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

interface SeededAccount {
  accountId: string;
  pangolinUserId: string;
}

function seedAccount(
  database: DatabaseHandle,
  pangolinUserId = `pangolin-${randomUUID()}`
): SeededAccount {
  const accountId = randomUUID();

  database.db
    .insert(accounts)
    .values({
      id: accountId,
      pangolinUserId,
      displayName: 'Account',
      email: null,
      avatarUrl: null,
      role: UserRole.User
    })
    .run();

  return { accountId, pangolinUserId };
}

function seedPlaylist(
  database: DatabaseHandle,
  ownerAccountId: string,
  options: {
    createdAt?: string;
    name?: string;
    coverUrl?: string | null;
    sourceUrl?: string | null;
    lastSyncedAt?: string | null;
    syncStatus?: PlaylistSyncStatus;
  } = {}
): string {
  const playlistId = randomUUID();

  database.db
    .insert(playlists)
    .values({
      id: playlistId,
      ownerAccountId,
      name: options.name ?? 'Playlist',
      coverUrl: options.coverUrl ?? null,
      provider: Provider.Youtube,
      sourcePlaylistId: `source-${playlistId}`,
      sourceUrl: options.sourceUrl ?? null,
      syncStatus: options.syncStatus ?? PlaylistSyncStatus.Idle,
      lastSyncedAt: options.lastSyncedAt ?? null,
      createdAt: options.createdAt ?? new Date().toISOString()
    })
    .run();

  return playlistId;
}

function seedTrack(
  database: DatabaseHandle,
  options: {
    fileStatus?: TrackFileStatus;
    sourceStatus?: TrackSourceStatus;
    title?: string;
    durationSeconds?: number | null;
    thumbnailPath?: string | null;
    failureReason?: string | null;
  } = {}
): string {
  const trackId = randomUUID();

  database.db
    .insert(tracks)
    .values({
      id: trackId,
      provider: Provider.Youtube,
      videoId: `video-${trackId}`,
      title: options.title ?? 'Track',
      durationSeconds: options.durationSeconds ?? null,
      thumbnailPath: options.thumbnailPath ?? null,
      fileStatus: options.fileStatus ?? TrackFileStatus.Stored,
      filePath: null,
      sourceStatus: options.sourceStatus ?? TrackSourceStatus.Available,
      failureReason: options.failureReason ?? null
    })
    .run();

  return trackId;
}

/*
 * A share is seeded by inserting the row directly, and that is deliberate rather
 * than a shortcut. No route writes one: all three of /playlists/:id/shares are
 * sendNotImplemented stubs, so the service has no writer to go through. Inserting
 * the row is the only way to put the database in the state a shared playlist is
 * actually in, which is the state the access fields exist to describe.
 */
function seedShare(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string,
  level: ShareLevel = ShareLevel.Read
): void {
  database.db
    .insert(shares)
    .values({ id: randomUUID(), playlistId, accountId, level })
    .run();
}

/*
 * The statements a piece of work causes the driver to prepare.
 *
 * There is no query counter in this harness and better-sqlite3 v13 has no
 * db.trace, so the seam is sqlite.prepare, which is the one method drizzle
 * reaches the database through. It is patched on the instance for the duration
 * and restored by stop(), and it is a test-only seam: nothing in the server
 * knows it exists.
 *
 * It records rather than counts, because the caller wants different things from
 * it. A total says whether the work grew with the page, which is the property
 * that matters and which no knowledge of the SQL is needed for. A filter over
 * the recorded statements says what shape the queries took, which is worth
 * pinning separately and is worth naming in the test that does it.
 */
function recordStatements(database: DatabaseHandle): {
  statements: string[];
  stop(): void;
} {
  const sqlite = database.sqlite as unknown as {
    prepare: (sql: string) => unknown;
  };
  const original = sqlite.prepare;
  const statements: string[] = [];

  sqlite.prepare = function (sql: string): unknown {
    statements.push(sql);
    return original.call(this, sql);
  };

  return {
    statements,
    stop: (): void => {
      sqlite.prepare = original;
    }
  };
}

/*
 * Associations are created through the service rather than by inserting rows,
 * because that is the only path that maintains the stored count. A test that
 * inserted directly would see a count of 0 and prove nothing about the column.
 */
function addTrackAt(
  database: DatabaseHandle,
  playlistId: string,
  trackId: string,
  position: number,
  origin: AssociationOrigin = AssociationOrigin.Remote
): void {
  const outcome = addAssociation(database, {
    playlistId,
    trackId,
    origin,
    position
  });

  expect(outcome).toBe('added');
}

function addTrack(
  database: DatabaseHandle,
  playlistId: string,
  trackId: string
): void {
  addTrackAt(database, playlistId, trackId, 0);
}

/* What the associations table actually holds, counted the way this ticket
 * originally computed the field, so a stored count can be held against it. */
function countAssociations(
  database: DatabaseHandle,
  playlistId: string
): number {
  const row = database.db
    .select({ total: sql<number>`count(*)` })
    .from(sql`association`)
    .where(sql`playlist_id = ${playlistId}`)
    .get();

  return row?.total ?? 0;
}

function get(url: string, pangolinUserId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'GET',
    url,
    headers: { 'remote-user': pangolinUserId }
  });
}

function patch(
  url: string,
  pangolinUserId: string,
  payload: Record<string, unknown>
) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'PATCH',
    url,
    headers: { 'remote-user': pangolinUserId, 'x-playliberty-client': 'test' },
    payload
  });
}

describe('GET /playlists', () => {
  it('returns a page whose items parse against the contract', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId, {
      name: 'Evening'
    });
    addTrack(context.database, playlistId, seedTrack(context.database));
    addTrack(context.database, playlistId, seedTrack(context.database));

    const response = await get('/api/v1/playlists', owner.pangolinUserId);

    expect(response.statusCode).toBe(200);
    const page = PageSchema.parse(response.json());
    expect(page.total).toBe(1);
    expect(page.limit).toBe(50);
    expect(page.offset).toBe(0);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.name).toBe('Evening');
    expect(page.items[0]?.trackCount).toBe(2);
  });

  it('reports a playlist with no associations as 0 rather than null', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    seedPlaylist(context.database, owner.accountId);

    const response = await get('/api/v1/playlists', owner.pangolinUserId);

    const page = PageSchema.parse(response.json());
    expect(page.items[0]?.trackCount).toBe(0);
    expect(page.items[0]?.trackCount).not.toBeNull();
  });

  it('counts associations whose track is unavailable or removed from the source', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    addTrack(
      context.database,
      playlistId,
      seedTrack(context.database, { fileStatus: TrackFileStatus.Unavailable })
    );
    addTrack(
      context.database,
      playlistId,
      seedTrack(context.database, { sourceStatus: TrackSourceStatus.Removed })
    );
    addTrack(
      context.database,
      playlistId,
      seedTrack(context.database, { fileStatus: TrackFileStatus.Pending })
    );

    const response = await get('/api/v1/playlists', owner.pangolinUserId);

    const page = PageSchema.parse(response.json());
    expect(page.items[0]?.trackCount).toBe(3);
  });

  it('counts pending tracks, because the count is a total and not a promise', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    for (let index = 0; index < 4; index += 1) {
      addTrack(
        context.database,
        playlistId,
        seedTrack(context.database, { fileStatus: TrackFileStatus.Pending })
      );
    }
    addTrack(
      context.database,
      playlistId,
      seedTrack(context.database, { fileStatus: TrackFileStatus.Stored })
    );

    const response = await get('/api/v1/playlists', owner.pangolinUserId);

    const page = PageSchema.parse(response.json());
    expect(page.items[0]?.trackCount).toBe(5);
  });

  it('reads the count from the playlist row and does not count anything to produce it', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistIds = Array.from({ length: 6 }, (_, index) =>
      seedPlaylist(context!.database, owner.accountId, {
        name: `Playlist ${index}`,
        createdAt: `2026-09-2${index}T10:00:00.000Z`
      })
    );
    addTrack(
      context.database,
      playlistIds[0] ?? '',
      seedTrack(context.database)
    );
    addTrack(
      context.database,
      playlistIds[0] ?? '',
      seedTrack(context.database)
    );

    const response = await get('/api/v1/playlists', owner.pangolinUserId);

    expect(response.statusCode).toBe(200);
    const page = PageSchema.parse(response.json());
    expect(page.items).toHaveLength(6);
    // Newest first, and the two tracks are on the oldest playlist, so the 2 lands
    // last. The order is part of what this asserts: a page whose order is not
    // stable cannot be paged.
    expect(page.items.map(item => item.trackCount)).toEqual([0, 0, 0, 0, 0, 2]);
  });

  it('paginates with a stable order and a total that ignores the page', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    for (let index = 0; index < 3; index += 1) {
      seedPlaylist(context.database, owner.accountId, {
        name: `Playlist ${index}`,
        createdAt: `2026-09-0${index + 1}T10:00:00.000Z`
      });
    }

    const firstPage = PageSchema.parse(
      (
        await get('/api/v1/playlists?limit=2&offset=0', owner.pangolinUserId)
      ).json()
    );
    const secondPage = PageSchema.parse(
      (
        await get('/api/v1/playlists?limit=2&offset=2', owner.pangolinUserId)
      ).json()
    );

    expect(firstPage.total).toBe(3);
    expect(secondPage.total).toBe(3);
    expect(firstPage.items.map(item => item.name)).toEqual([
      'Playlist 2',
      'Playlist 1'
    ]);
    expect(secondPage.items.map(item => item.name)).toEqual(['Playlist 0']);
  });

  it('lists a playlist shared to the account alongside the ones it owns', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    seedPlaylist(context.database, owner.accountId, {
      name: 'Mine',
      createdAt: '2026-09-01T10:00:00.000Z'
    });
    const sharedId = seedPlaylist(context.database, owner.accountId, {
      name: 'Shared',
      createdAt: '2026-09-02T10:00:00.000Z'
    });
    const stranger = seedAccount(context.database);
    seedShare(context.database, sharedId, stranger.accountId, ShareLevel.Read);

    const page = PageSchema.parse(
      (await get('/api/v1/playlists', stranger.pangolinUserId)).json()
    );

    expect(page.total).toBe(1);
    expect(page.items[0]?.name).toBe('Shared');
    expect(page.items[0]?.ownerAccountId).toBe(owner.accountId);
  });

  it('does not list a playlist the account cannot see', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    seedPlaylist(context.database, owner.accountId);
    const stranger = seedAccount(context.database);

    const page = PageSchema.parse(
      (await get('/api/v1/playlists', stranger.pangolinUserId)).json()
    );

    expect(page.total).toBe(0);
    expect(page.items).toEqual([]);
  });

  it('rejects a query string the page schema refuses', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);

    const response = await get(
      '/api/v1/playlists?limit=0&offset=0',
      owner.pangolinUserId
    );

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'invalid_request' });
  });

  it('requires an identity', async () => {
    context = await createTestContext();
    const response = await context.app.inject({
      method: 'GET',
      url: '/api/v1/playlists'
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'unauthenticated' });
  });
});

describe('GET /playlists/:id', () => {
  it('returns the playlist with its count', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    addTrack(context.database, playlistId, seedTrack(context.database));

    const response = await get(
      `/api/v1/playlists/${playlistId}`,
      owner.pangolinUserId
    );

    expect(response.statusCode).toBe(200);
    const playlist = PlaylistSchema.parse(response.json());
    expect(playlist.id).toBe(playlistId);
    expect(playlist.trackCount).toBe(1);
  });

  it('agrees with the list route about the same playlist', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    addTrack(context.database, playlistId, seedTrack(context.database));
    addTrack(context.database, playlistId, seedTrack(context.database));

    const read = PlaylistSchema.parse(
      (
        await get(`/api/v1/playlists/${playlistId}`, owner.pangolinUserId)
      ).json()
    );
    const listed = PageSchema.parse(
      (await get('/api/v1/playlists', owner.pangolinUserId)).json()
    );

    expect(read.trackCount).toBe(
      listed.items.find(item => item.id === playlistId)?.trackCount
    );
  });

  it('answers 404 for a playlist that does not exist', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);

    const response = await get(
      `/api/v1/playlists/${randomUUID()}`,
      owner.pangolinUserId
    );

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'playlist_not_found' });
  });

  it('answers 404 rather than 403 for a playlist the account cannot see', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    const stranger = seedAccount(context.database);

    const response = await get(
      `/api/v1/playlists/${playlistId}`,
      stranger.pangolinUserId
    );

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'playlist_not_found' });
  });

  it('returns a shared playlist to a collaborator', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    addTrack(context.database, playlistId, seedTrack(context.database));
    const reader = seedAccount(context.database);
    seedShare(context.database, playlistId, reader.accountId, ShareLevel.Read);

    const response = await get(
      `/api/v1/playlists/${playlistId}`,
      reader.pangolinUserId
    );

    expect(response.statusCode).toBe(200);
    expect(PlaylistSchema.parse(response.json()).trackCount).toBe(1);
  });
});

describe("the requesting account's access to a playlist", () => {
  it('tells the owner of an unshared playlist that it is theirs and that nobody else has it', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);

    const playlist = PlaylistSchema.parse(
      (
        await get(`/api/v1/playlists/${playlistId}`, owner.pangolinUserId)
      ).json()
    );

    // The pair that is false and false, which is the answer for every playlist
    // on the instance today because no route writes a share.
    expect(playlist.access).toBe('owner');
    expect(playlist.hasShares).toBe(false);
  });

  it('tells the owner of a shared playlist that they still hold the keys', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    const reader = seedAccount(context.database);
    seedShare(context.database, playlistId, reader.accountId, ShareLevel.Read);

    const playlist = PlaylistSchema.parse(
      (
        await get(`/api/v1/playlists/${playlistId}`, owner.pangolinUserId)
      ).json()
    );

    // owner and shared is the pair the header draws as a padlock and an arrow,
    // so it is the one that has to be reachable and distinguishable from owner
    // and not shared.
    expect(playlist.access).toBe('owner');
    expect(playlist.hasShares).toBe(true);
  });

  it.each([ShareLevel.Read, ShareLevel.Write])(
    'reports a %s collaborator at that level, and never as the owner',
    async level => {
      context = await createTestContext();
      const owner = seedAccount(context.database);
      const playlistId = seedPlaylist(context.database, owner.accountId);
      const collaborator = seedAccount(context.database);
      seedShare(context.database, playlistId, collaborator.accountId, level);

      const playlist = PlaylistSchema.parse(
        (
          await get(
            `/api/v1/playlists/${playlistId}`,
            collaborator.pangolinUserId
          )
        ).json()
      );

      // A playlist a collaborator holds a share on is shared by definition, so
      // hasShares is true for them too and carries no new information. access is
      // the field that has to distinguish the two levels, because the overflow
      // menu differs: a write collaborator may sync and a read one may not.
      expect(playlist.access).toBe(level);
      expect(playlist.access).not.toBe('owner');
      expect(playlist.hasShares).toBe(true);
    }
  );

  it('gives the owner and the collaborator different access to the same playlist', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    const writer = seedAccount(context.database);
    seedShare(context.database, playlistId, writer.accountId, ShareLevel.Write);

    const asOwner = PlaylistSchema.parse(
      (
        await get(`/api/v1/playlists/${playlistId}`, owner.pangolinUserId)
      ).json()
    );
    const asCollaborator = PlaylistSchema.parse(
      (
        await get(`/api/v1/playlists/${playlistId}`, writer.pangolinUserId)
      ).json()
    );

    // Same playlist, same body, two different answers, which is the whole reason
    // access is a property of the request rather than of the row.
    expect(asOwner.id).toBe(asCollaborator.id);
    expect(asOwner.access).toBe('owner');
    expect(asCollaborator.access).toBe(ShareLevel.Write);
    // And hasShares is the one that does not change with who is asking.
    expect(asOwner.hasShares).toBe(asCollaborator.hasShares);
  });

  it('lists an owned playlist and a shared one with different access in one page', async () => {
    context = await createTestContext();
    // One account, holding one playlist of its own and a share on somebody
    // else's. A page where the reader owns nothing would be all collaborator
    // rows, and a page where nobody is a collaborator would be all owner rows;
    // only a page with both can catch access being hardcoded to either.
    const reader = seedAccount(context.database);
    const other = seedAccount(context.database);
    seedPlaylist(context.database, reader.accountId, {
      name: 'Mine',
      createdAt: '2026-09-01T10:00:00.000Z'
    });
    const sharedId = seedPlaylist(context.database, other.accountId, {
      name: 'Theirs',
      createdAt: '2026-09-02T10:00:00.000Z'
    });
    seedShare(context.database, sharedId, reader.accountId, ShareLevel.Read);

    const page = PageSchema.parse(
      (await get('/api/v1/playlists', reader.pangolinUserId)).json()
    );

    // This is the assertion that stops access being hardcoded to owner on the
    // list route. The library is not owner-scoped: visibleTo returns owned or
    // shared, so a page can hold both kinds of row and the field has to differ
    // between them.
    expect(page.items.map(item => [item.name, item.access])).toEqual([
      ['Theirs', ShareLevel.Read],
      ['Mine', 'owner']
    ]);
    // And the two fields are not the same fact wearing two names. The reader
    // holds a share on Theirs and none on Mine, so access differs between the
    // two rows while hasShares is true for one and false for the other. A field
    // derived from the requester's own share would be true for both, and a field
    // derived from access alone could not be false for a playlist the reader
    // owns.
    expect(page.items.map(item => item.hasShares)).toEqual([true, false]);
  });

  it('answers 404 for a playlist neither owned nor shared, and says nothing about shares', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    const stranger = seedAccount(context.database);

    const response = await get(
      `/api/v1/playlists/${playlistId}`,
      stranger.pangolinUserId
    );

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body).toMatchObject({ code: 'playlist_not_found' });
    // The disclosure is that the playlist is not there. Naming whether it is
    // shared, or who holds it, in the body would confirm it exists.
    expect(JSON.stringify(body)).not.toContain('access');
    expect(JSON.stringify(body)).not.toContain('hasShares');
  });

  it('omits an invisible playlist from the list rather than answering 404 for it', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    seedPlaylist(context.database, owner.accountId, { name: 'Private' });
    const stranger = seedAccount(context.database);

    // The list route has no 404 to give: a page simply does not contain it. The
    // pair of routes is asserted together because only one of them can be a 404
    // and the disclosure property is that neither reveals the playlist.
    const page = PageSchema.parse(
      (await get('/api/v1/playlists', stranger.pangolinUserId)).json()
    );

    expect(page.total).toBe(0);
    expect(page.items).toEqual([]);
  });

  it('prepares the same number of statements for a page of one and a page of six', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    seedPlaylist(context.database, owner.accountId);

    const recordingOneRow = recordStatements(context.database);
    const oneRow = PageSchema.parse(
      (await get('/api/v1/playlists', owner.pangolinUserId)).json()
    );
    recordingOneRow.stop();

    for (let index = 0; index < 5; index += 1) {
      seedPlaylist(context.database, owner.accountId);
    }
    const recordingSixRows = recordStatements(context.database);
    const sixRows = PageSchema.parse(
      (await get('/api/v1/playlists', owner.pangolinUserId)).json()
    );
    recordingSixRows.stop();

    // The page really did grow, or the equality below would be free.
    expect(oneRow.items).toHaveLength(1);
    expect(sixRows.items).toHaveLength(6);

    // This is the whole of "no N+1", and it is asserted without reading a single
    // statement of SQL. A per-row lookup for either new fact is one more
    // statement per playlist, so a six-row page would prepare six more and this
    // would fail with 3 against 8. It also catches a lookup added for a field
    // nobody has asked for yet, which a test that only counted share statements
    // would not.
    expect(recordingSixRows.statements.length).toBe(
      recordingOneRow.statements.length
    );
  });

  it('looks up has-shares once for the page, which the statement text shows', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    seedPlaylist(context.database, owner.accountId);

    // This test asserts the shape of the SQL, and says so in its name, because
    // the property test above would also pass on an implementation that got
    // has-shares right by some other route. The pattern is matched against the
    // whole statement: the page query and the count query each contain
    // 'from "share"' inside their visibility subquery, and only this one is the
    // page-level lookup.
    const recording = recordStatements(context.database);
    await get('/api/v1/playlists', owner.pangolinUserId);
    recording.stop();

    const grouped = recording.statements.filter(statement =>
      /^select distinct "playlist_id" from "share" where "share"."playlist_id" in \(/i.test(
        statement
      )
    );

    expect(grouped).toHaveLength(1);
  });
});

describe('the stored track count', () => {
  it('matches the number of association rows after adds and removes', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    const first = seedTrack(context.database);
    const second = seedTrack(context.database);

    addTrack(context.database, playlistId, first);
    addTrack(context.database, playlistId, second);
    removeAssociation(context.database, { playlistId, trackId: first });

    const page = PageSchema.parse(
      (await get('/api/v1/playlists', owner.pangolinUserId)).json()
    );

    expect(page.items[0]?.trackCount).toBe(
      countAssociations(context.database, playlistId)
    );
    expect(page.items[0]?.trackCount).toBe(1);
  });

  it('does not count an association that is already there twice', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    const trackId = seedTrack(context.database);
    addTrack(context.database, playlistId, trackId);

    const repeat = addAssociation(context.database, {
      playlistId,
      trackId,
      origin: AssociationOrigin.Manual,
      position: 1
    });

    expect(repeat).toBe('already_present');
    const page = PageSchema.parse(
      (await get('/api/v1/playlists', owner.pangolinUserId)).json()
    );
    expect(page.items[0]?.trackCount).toBe(1);
  });

  it('does not go below zero when a track is removed twice', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    const trackId = seedTrack(context.database);
    addTrack(context.database, playlistId, trackId);

    const first = removeAssociation(context.database, { playlistId, trackId });
    const second = removeAssociation(context.database, { playlistId, trackId });

    expect(first).toBe('removed');
    expect(second).toBe('absent');
    const page = PageSchema.parse(
      (await get('/api/v1/playlists', owner.pangolinUserId)).json()
    );
    expect(page.items[0]?.trackCount).toBe(0);
  });

  it('keeps two playlists counts independent', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const first = seedPlaylist(context.database, owner.accountId, {
      name: 'First',
      createdAt: '2026-09-02T10:00:00.000Z'
    });
    const second = seedPlaylist(context.database, owner.accountId, {
      name: 'Second',
      createdAt: '2026-09-01T10:00:00.000Z'
    });
    addTrack(context.database, first, seedTrack(context.database));
    addTrack(context.database, first, seedTrack(context.database));
    addTrack(context.database, first, seedTrack(context.database));
    addTrack(context.database, second, seedTrack(context.database));

    const page = PageSchema.parse(
      (await get('/api/v1/playlists', owner.pangolinUserId)).json()
    );

    expect(page.items.map(item => [item.name, item.trackCount])).toEqual([
      ['First', 3],
      ['Second', 1]
    ]);
  });
});

describe('GET /playlists/:id/tracks', () => {
  it('returns the associations in position order, each with its origin and position', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    const third = seedTrack(context.database);
    const first = seedTrack(context.database);
    const second = seedTrack(context.database);

    // Inserted out of position order, so an implementation that returned
    // insertion order would fail here.
    addTrackAt(
      context.database,
      playlistId,
      third,
      3,
      AssociationOrigin.Manual
    );
    addTrackAt(context.database, playlistId, first, 0);
    addTrackAt(context.database, playlistId, second, 1);

    const response = await get(
      `/api/v1/playlists/${playlistId}/tracks`,
      owner.pangolinUserId
    );

    expect(response.statusCode).toBe(200);
    const page = PlaylistTrackPageSchema.parse(response.json());
    expect(page.total).toBe(3);
    expect(page.items.map(item => item.track.id)).toEqual([
      first,
      second,
      third
    ]);
    expect(page.items.map(item => item.position)).toEqual([0, 1, 3]);
    expect(page.items.map(item => item.origin)).toEqual([
      AssociationOrigin.Remote,
      AssociationOrigin.Remote,
      AssociationOrigin.Manual
    ]);
  });

  it('never returns a track the playlist does not associate', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    const otherId = seedPlaylist(context.database, owner.accountId);
    const mine = seedTrack(context.database);
    const theirs = seedTrack(context.database);
    addTrack(context.database, playlistId, mine);
    addTrack(context.database, otherId, theirs);

    const page = PlaylistTrackPageSchema.parse(
      (
        await get(
          `/api/v1/playlists/${playlistId}/tracks`,
          owner.pangolinUserId
        )
      ).json()
    );

    expect(page.items.map(item => item.track.id)).toEqual([mine]);
    expect(page.total).toBe(1);
  });

  it('returns a track held by two playlists once', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const first = seedPlaylist(context.database, owner.accountId);
    const second = seedPlaylist(context.database, owner.accountId);
    const shared = seedTrack(context.database);
    addTrack(context.database, first, shared);
    addTrack(context.database, second, shared);

    const page = PlaylistTrackPageSchema.parse(
      (
        await get(`/api/v1/playlists/${first}/tracks`, owner.pangolinUserId)
      ).json()
    );

    expect(page.items.map(item => item.track.id)).toEqual([shared]);
    expect(page.total).toBe(1);
  });

  it('returns associations that share a position in the same order across two calls', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    const firstInserted = seedTrack(context.database);
    const secondInserted = seedTrack(context.database);
    // Position is assigned by the writers, so two associations in one run can
    // share it; insertion order is the tiebreak.
    addTrackAt(context.database, playlistId, firstInserted, 5);
    addTrackAt(context.database, playlistId, secondInserted, 5);

    const url = `/api/v1/playlists/${playlistId}/tracks`;
    const firstPage = PlaylistTrackPageSchema.parse(
      (await get(url, owner.pangolinUserId)).json()
    );
    const secondPage = PlaylistTrackPageSchema.parse(
      (await get(url, owner.pangolinUserId)).json()
    );

    expect(firstPage.items.map(item => item.track.id)).toEqual([
      firstInserted,
      secondInserted
    ]);
    expect(secondPage.items.map(item => item.track.id)).toEqual(
      firstPage.items.map(item => item.track.id)
    );
  });

  it('answers a playlist with no associations as an empty page, not an error', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);

    const response = await get(
      `/api/v1/playlists/${playlistId}/tracks`,
      owner.pangolinUserId
    );

    expect(response.statusCode).toBe(200);
    const page = PlaylistTrackPageSchema.parse(response.json());
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    expect(page.limit).toBe(50);
    expect(page.offset).toBe(0);
  });

  it('answers 404 rather than 403 for a playlist the account cannot see', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    const stranger = seedAccount(context.database);

    const response = await get(
      `/api/v1/playlists/${playlistId}/tracks`,
      stranger.pangolinUserId
    );

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'playlist_not_found' });
  });

  it('answers 404 for a playlist that does not exist', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);

    const response = await get(
      `/api/v1/playlists/${randomUUID()}/tracks`,
      owner.pangolinUserId
    );

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'playlist_not_found' });
  });

  it('returns the requested window with the true total and a short last page', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    for (let index = 0; index < 5; index += 1) {
      addTrackAt(
        context.database,
        playlistId,
        seedTrack(context.database),
        index
      );
    }

    const firstPage = PlaylistTrackPageSchema.parse(
      (
        await get(
          `/api/v1/playlists/${playlistId}/tracks?limit=2&offset=0`,
          owner.pangolinUserId
        )
      ).json()
    );
    const lastPage = PlaylistTrackPageSchema.parse(
      (
        await get(
          `/api/v1/playlists/${playlistId}/tracks?limit=2&offset=4`,
          owner.pangolinUserId
        )
      ).json()
    );

    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.total).toBe(5);
    expect(lastPage.items).toHaveLength(1);
    expect(lastPage.total).toBe(5);
    expect(lastPage.limit).toBe(2);
    expect(lastPage.offset).toBe(4);
  });

  it('changes nothing when it reads', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    addTrack(context.database, playlistId, seedTrack(context.database));

    const before = countAssociations(context.database, playlistId);
    const recording = recordStatements(context.database);
    await get(`/api/v1/playlists/${playlistId}/tracks`, owner.pangolinUserId);
    recording.stop();

    // The route reads state and writes none. The identity hook upserts the
    // account on every request, so the claim is about the playlist's own tables:
    // no insert, update or delete touches the playlist, its associations or its
    // tracks, and the associations are exactly where they were.
    const writes = recording.statements.filter(
      statement =>
        /^\s*(insert|update|delete)\b/i.test(statement) &&
        /"(association|playlist|track)"/i.test(statement)
    );
    expect(writes).toEqual([]);
    expect(countAssociations(context.database, playlistId)).toBe(before);
  });

  it('rejects a query string the page schema refuses', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);

    const response = await get(
      `/api/v1/playlists/${playlistId}/tracks?limit=0`,
      owner.pangolinUserId
    );

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'invalid_request' });
  });

  it('returns the playlist to its owner', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    addTrack(context.database, playlistId, seedTrack(context.database));

    const response = await get(
      `/api/v1/playlists/${playlistId}/tracks`,
      owner.pangolinUserId
    );

    expect(response.statusCode).toBe(200);
    expect(PlaylistTrackPageSchema.parse(response.json()).items).toHaveLength(
      1
    );
  });

  it.each([ShareLevel.Read, ShareLevel.Write])(
    'returns the playlist to a %s collaborator',
    async level => {
      context = await createTestContext();
      const owner = seedAccount(context.database);
      const playlistId = seedPlaylist(context.database, owner.accountId);
      addTrack(context.database, playlistId, seedTrack(context.database));
      const collaborator = seedAccount(context.database);
      seedShare(context.database, playlistId, collaborator.accountId, level);

      const response = await get(
        `/api/v1/playlists/${playlistId}/tracks`,
        collaborator.pangolinUserId
      );

      expect(response.statusCode).toBe(200);
      const page = PlaylistTrackPageSchema.parse(response.json());
      expect(page.items).toHaveLength(1);
      expect(page.total).toBe(1);
    }
  );

  it('answers 404 after a share is revoked, the same as never having had one', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    addTrack(context.database, playlistId, seedTrack(context.database));
    const collaborator = seedAccount(context.database);
    seedShare(
      context.database,
      playlistId,
      collaborator.accountId,
      ShareLevel.Read
    );

    const before = await get(
      `/api/v1/playlists/${playlistId}/tracks`,
      collaborator.pangolinUserId
    );
    expect(before.statusCode).toBe(200);

    context.database.db
      .delete(shares)
      .where(sql`playlist_id = ${playlistId}`)
      .run();

    const after = await get(
      `/api/v1/playlists/${playlistId}/tracks`,
      collaborator.pangolinUserId
    );

    expect(after.statusCode).toBe(404);
    expect(after.json()).toMatchObject({ code: 'playlist_not_found' });
  });

  it.each([
    TrackFileStatus.Pending,
    TrackFileStatus.Downloading,
    TrackFileStatus.Stored,
    TrackFileStatus.Failed,
    TrackFileStatus.Unavailable
  ])('returns a track in the %s file state', async fileStatus => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    addTrack(
      context.database,
      playlistId,
      seedTrack(context.database, { fileStatus })
    );

    const page = PlaylistTrackPageSchema.parse(
      (
        await get(
          `/api/v1/playlists/${playlistId}/tracks`,
          owner.pangolinUserId
        )
      ).json()
    );

    expect(page.items[0]?.track.fileStatus).toBe(fileStatus);
  });

  it.each([TrackSourceStatus.Available, TrackSourceStatus.Removed])(
    'returns a track in the %s source state',
    async sourceStatus => {
      context = await createTestContext();
      const owner = seedAccount(context.database);
      const playlistId = seedPlaylist(context.database, owner.accountId);
      addTrack(
        context.database,
        playlistId,
        seedTrack(context.database, { sourceStatus })
      );

      const page = PlaylistTrackPageSchema.parse(
        (
          await get(
            `/api/v1/playlists/${playlistId}/tracks`,
            owner.pangolinUserId
          )
        ).json()
      );

      expect(page.items[0]?.track.sourceStatus).toBe(sourceStatus);
    }
  );

  it('returns a failed track with its reason', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    addTrack(
      context.database,
      playlistId,
      seedTrack(context.database, {
        fileStatus: TrackFileStatus.Failed,
        failureReason: 'yt-dlp exited with code 1'
      })
    );

    const page = PlaylistTrackPageSchema.parse(
      (
        await get(
          `/api/v1/playlists/${playlistId}/tracks`,
          owner.pangolinUserId
        )
      ).json()
    );

    expect(page.items[0]?.track.fileStatus).toBe(TrackFileStatus.Failed);
    expect(page.items[0]?.track.failureReason).toBe(
      'yt-dlp exited with code 1'
    );
  });

  it('returns a failure reason as stored, however long', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    const reason = `the download failed while fetching the stream: ${'x'.repeat(300)}`;
    addTrack(
      context.database,
      playlistId,
      seedTrack(context.database, {
        fileStatus: TrackFileStatus.Failed,
        failureReason: reason
      })
    );

    const page = PlaylistTrackPageSchema.parse(
      (
        await get(
          `/api/v1/playlists/${playlistId}/tracks`,
          owner.pangolinUserId
        )
      ).json()
    );

    // Not truncated here: the row is where a long reason is bounded, and this
    // route returns what the download wrote.
    expect(page.items[0]?.track.failureReason).toBe(reason);
  });

  it('returns a null thumbnail and a null duration as nulls, not absent keys', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);
    addTrack(
      context.database,
      playlistId,
      seedTrack(context.database, {
        thumbnailPath: null,
        durationSeconds: null
      })
    );

    const page = PlaylistTrackPageSchema.parse(
      (
        await get(
          `/api/v1/playlists/${playlistId}/tracks`,
          owner.pangolinUserId
        )
      ).json()
    );

    const track = page.items[0]?.track;
    expect(track).toHaveProperty('thumbnailPath');
    expect(track).toHaveProperty('durationSeconds');
    expect(track?.thumbnailPath).toBeNull();
    expect(track?.durationSeconds).toBeNull();
  });
});

describe('PATCH /playlists/:id', () => {
  it('renames as the owner and stores the trimmed name', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId, {
      name: 'Before'
    });

    const response = await patch(
      `/api/v1/playlists/${playlistId}`,
      owner.pangolinUserId,
      { name: '  Evening Jazz  ' }
    );

    expect(response.statusCode).toBe(200);
    expect(PlaylistSchema.parse(response.json()).name).toBe('Evening Jazz');
    expect(
      context.database.db
        .select()
        .from(playlists)
        .where(eq(playlists.id, playlistId))
        .get()?.name
    ).toBe('Evening Jazz');
  });

  it('refuses a name that is empty after trimming and leaves the playlist alone', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId, {
      name: 'Kept'
    });

    const response = await patch(
      `/api/v1/playlists/${playlistId}`,
      owner.pangolinUserId,
      { name: '   ' }
    );

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'invalid_request' });
    expect(
      context.database.db
        .select()
        .from(playlists)
        .where(eq(playlists.id, playlistId))
        .get()?.name
    ).toBe('Kept');
  });

  it('refuses a name longer than two hundred characters', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);

    const response = await patch(
      `/api/v1/playlists/${playlistId}`,
      owner.pangolinUserId,
      { name: 'x'.repeat(201) }
    );

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'invalid_request' });
  });

  it('answers 404 for a write collaborator, a read collaborator, a stranger and a missing playlist', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId, {
      name: 'Kept'
    });
    const writer = seedAccount(context.database);
    seedShare(context.database, playlistId, writer.accountId, ShareLevel.Write);
    const reader = seedAccount(context.database);
    seedShare(context.database, playlistId, reader.accountId, ShareLevel.Read);
    const stranger = seedAccount(context.database);

    const attempts: [string, string][] = [
      [playlistId, writer.pangolinUserId],
      [playlistId, reader.pangolinUserId],
      [playlistId, stranger.pangolinUserId],
      [randomUUID(), owner.pangolinUserId]
    ];

    for (const [targetId, pangolinUserId] of attempts) {
      const response = await patch(
        `/api/v1/playlists/${targetId}`,
        pangolinUserId,
        { name: 'Renamed' }
      );

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ code: 'playlist_not_found' });
    }

    expect(
      context.database.db
        .select()
        .from(playlists)
        .where(eq(playlists.id, playlistId))
        .get()?.name
    ).toBe('Kept');
  });

  it('changes the name and the updated timestamp and nothing else', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId, {
      name: 'Before',
      coverUrl: 'https://example.com/cover.jpg',
      sourceUrl: 'https://www.youtube.com/playlist?list=PL1234567890abcdef',
      lastSyncedAt: '2020-06-01T00:00:00.000Z',
      syncStatus: PlaylistSyncStatus.Error
    });
    context.database.db
      .update(playlists)
      .set({ updatedAt: '2020-01-01T00:00:00.000Z' })
      .where(eq(playlists.id, playlistId))
      .run();
    const before = context.database.db
      .select()
      .from(playlists)
      .where(eq(playlists.id, playlistId))
      .get();

    await patch(`/api/v1/playlists/${playlistId}`, owner.pangolinUserId, {
      name: 'After'
    });

    const after = context.database.db
      .select()
      .from(playlists)
      .where(eq(playlists.id, playlistId))
      .get();

    expect(after?.name).toBe('After');
    expect(after?.updatedAt).not.toBe(before?.updatedAt);
    expect(after?.sourceUrl).toBe(before?.sourceUrl);
    expect(after?.coverUrl).toBe(before?.coverUrl);
    expect(after?.lastSyncedAt).toBe(before?.lastSyncedAt);
    expect(after?.syncStatus).toBe(before?.syncStatus);
  });

  it('refuses a request without the client header', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, owner.accountId);

    const response = await context.app.inject({
      method: 'PATCH',
      url: `/api/v1/playlists/${playlistId}`,
      headers: { 'remote-user': owner.pangolinUserId },
      payload: { name: 'Renamed' }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'csrf_header_missing' });
  });
});
