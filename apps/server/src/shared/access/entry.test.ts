import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AssociationOrigin,
  Provider,
  ShareLevel,
  TrackFileStatus,
  TrackSourceStatus,
  UserRole
} from '@playliberty/contracts';
import type { PlaylistAccess } from '@playliberty/contracts';

import type { TestContext } from '../../app/testing/createTestContext.js';
import { createTestContext } from '../../app/testing/createTestContext.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import {
  accounts,
  associations,
  playlists,
  shares,
  tracks
} from '../../platform/database/schema.js';
import {
  AccessNeed,
  EntryOutcome,
  playlistEntry,
  trackEntry
} from './entry.js';

/*
 * The entry seam is what makes the check structural: a new entry point is a
 * handler handed to `playlistEntry` or `trackEntry`, and the handler cannot run
 * unless the access module grants the need. These tests write entry points that
 * did not exist before and show the guard is on them, which is the property the
 * old hand-written guards could not promise.
 */

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

function database(): DatabaseHandle {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.database;
}

function seedAccount(displayName: string): string {
  const id = randomUUID();

  database()
    .db.insert(accounts)
    .values({
      id,
      pangolinUserId: `pangolin-${id}`,
      displayName,
      email: null,
      avatarUrl: null,
      role: UserRole.User
    })
    .run();

  return id;
}

function seedPlaylist(ownerAccountId: string): string {
  const id = randomUUID();

  database()
    .db.insert(playlists)
    .values({
      id,
      ownerAccountId,
      name: 'Playlist',
      provider: Provider.Youtube,
      sourcePlaylistId: `source-${id}`
    })
    .run();

  return id;
}

function seedShare(
  playlistId: string,
  accountId: string,
  level: ShareLevel
): void {
  database()
    .db.insert(shares)
    .values({ id: randomUUID(), playlistId, accountId, level })
    .run();
}

function seedTrack(playlistId: string): string {
  const trackId = randomUUID();

  database()
    .db.insert(tracks)
    .values({
      id: trackId,
      provider: Provider.Youtube,
      videoId: `video-${trackId}`,
      title: 'Track',
      durationSeconds: 180,
      thumbnailPath: null,
      fileStatus: TrackFileStatus.Stored,
      sourceStatus: TrackSourceStatus.Available,
      filePath: 'media/ee/song.m4a',
      failureReason: null
    })
    .run();

  database()
    .db.insert(associations)
    .values({
      id: randomUUID(),
      playlistId,
      trackId,
      origin: AssociationOrigin.Remote,
      position: 0
    })
    .run();

  return trackId;
}

/* Owner, a read collaborator, a write collaborator and a stranger. */
function seedCast(): {
  owner: string;
  reader: string;
  writer: string;
  stranger: string;
  playlistId: string;
  trackId: string;
} {
  const owner = seedAccount('Owner');
  const reader = seedAccount('Reader');
  const writer = seedAccount('Writer');
  const stranger = seedAccount('Stranger');
  const playlistId = seedPlaylist(owner);
  const trackId = seedTrack(playlistId);

  seedShare(playlistId, reader, ShareLevel.Read);
  seedShare(playlistId, writer, ShareLevel.Write);

  return { owner, reader, writer, stranger, playlistId, trackId };
}

describe('the playlist entry seam', () => {
  it('runs a read handler for each account that reaches the playlist, handing it the level', async () => {
    context = await createTestContext();
    const cast = seedCast();
    const handler = vi.fn((access: PlaylistAccess) => `read as ${access}`);

    for (const [accountId, level] of [
      [cast.owner, 'owner'],
      [cast.reader, 'read'],
      [cast.writer, 'write']
    ] as const) {
      const entry = playlistEntry(
        database(),
        cast.playlistId,
        accountId,
        AccessNeed.Read,
        handler
      );

      expect(entry).toEqual({
        outcome: EntryOutcome.Granted,
        value: `read as ${level}`
      });
    }

    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('does not run a read handler for a stranger', async () => {
    context = await createTestContext();
    const cast = seedCast();
    const handler = vi.fn(() => 'never');

    const entry = playlistEntry(
      database(),
      cast.playlistId,
      cast.stranger,
      AccessNeed.Read,
      handler
    );

    expect(entry.outcome).toBe(EntryOutcome.Denied);
    expect(handler).not.toHaveBeenCalled();
  });

  it('runs a write handler for the owner and a write collaborator and no one else', async () => {
    context = await createTestContext();
    const cast = seedCast();
    const handler = vi.fn(() => 'wrote');

    for (const accountId of [cast.owner, cast.writer]) {
      expect(
        playlistEntry(
          database(),
          cast.playlistId,
          accountId,
          AccessNeed.Write,
          handler
        ).outcome
      ).toBe(EntryOutcome.Granted);
    }

    for (const accountId of [cast.reader, cast.stranger]) {
      expect(
        playlistEntry(
          database(),
          cast.playlistId,
          accountId,
          AccessNeed.Write,
          handler
        ).outcome
      ).toBe(EntryOutcome.Denied);
    }

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('runs an owner handler for the owner alone', async () => {
    context = await createTestContext();
    const cast = seedCast();
    const handler = vi.fn(() => 'managed');

    for (const accountId of [cast.reader, cast.writer, cast.stranger]) {
      expect(
        playlistEntry(
          database(),
          cast.playlistId,
          accountId,
          AccessNeed.Owner,
          handler
        ).outcome
      ).toBe(EntryOutcome.Denied);
    }

    expect(
      playlistEntry(
        database(),
        cast.playlistId,
        cast.owner,
        AccessNeed.Owner,
        handler
      ).outcome
    ).toBe(EntryOutcome.Granted);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('the track entry seam', () => {
  it('runs a read handler for every account the holding playlist reaches', async () => {
    context = await createTestContext();
    const cast = seedCast();
    const handler = vi.fn(() => 'streamed');

    for (const accountId of [cast.owner, cast.reader, cast.writer]) {
      expect(
        trackEntry(
          database(),
          cast.trackId,
          accountId,
          AccessNeed.Read,
          handler
        ).outcome
      ).toBe(EntryOutcome.Granted);
    }

    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('does not run a read handler for a stranger', async () => {
    context = await createTestContext();
    const cast = seedCast();
    const handler = vi.fn(() => 'never');

    const entry = trackEntry(
      database(),
      cast.trackId,
      cast.stranger,
      AccessNeed.Read,
      handler
    );

    expect(entry.outcome).toBe(EntryOutcome.Denied);
    expect(handler).not.toHaveBeenCalled();
  });

  it('runs a write handler for the owner and a write collaborator and no one else', async () => {
    context = await createTestContext();
    const cast = seedCast();
    const handler = vi.fn(() => 'retried');

    for (const accountId of [cast.owner, cast.writer]) {
      expect(
        trackEntry(
          database(),
          cast.trackId,
          accountId,
          AccessNeed.Write,
          handler
        ).outcome
      ).toBe(EntryOutcome.Granted);
    }

    for (const accountId of [cast.reader, cast.stranger]) {
      expect(
        trackEntry(
          database(),
          cast.trackId,
          accountId,
          AccessNeed.Write,
          handler
        ).outcome
      ).toBe(EntryOutcome.Denied);
    }

    expect(handler).toHaveBeenCalledTimes(2);
  });
});
