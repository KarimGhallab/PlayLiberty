import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShareLevel } from '@playliberty/contracts';
import type { PlaylistAccess } from '@playliberty/contracts';

import type { TestContext } from '../../app/testing/createTestContext.js';
import { createTestContext } from '../../app/testing/createTestContext.js';
import {
  associate,
  seedAccount,
  seedPlaylist,
  seedShare,
  seedTrack
} from '../../app/testing/fixtures.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import {
  AccessNeed,
  EntryOutcome,
  playlistEntry,
  trackEntry
} from './entry.js';

/*
 * Entry seam makes the check structural: a handler handed to `playlistEntry`
 * or `trackEntry` cannot run unless the access module grants the need.
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

/* Owner, a read collaborator, a write collaborator and a stranger. */
function seedCast(): {
  owner: string;
  reader: string;
  writer: string;
  stranger: string;
  playlistId: string;
  trackId: string;
} {
  const db = database();
  const owner = seedAccount(db, { displayName: 'Owner' }).accountId;
  const reader = seedAccount(db, { displayName: 'Reader' }).accountId;
  const writer = seedAccount(db, { displayName: 'Writer' }).accountId;
  const stranger = seedAccount(db, { displayName: 'Stranger' }).accountId;
  const { playlistId } = seedPlaylist(db, owner);
  const { trackId } = seedTrack(db, { filePath: 'media/ee/song.m4a' });

  associate(db, playlistId, trackId);

  seedShare(db, playlistId, reader, { level: ShareLevel.Read });
  seedShare(db, playlistId, writer, { level: ShareLevel.Write });

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
