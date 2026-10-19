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
  /* The one rule as a table: each resolved level against read, write and owner.
   * A stranger resolves to no level, so it satisfies nothing. */
  const MATRIX = [
    { level: 'owner', read: true, write: true, own: true },
    { level: 'write', read: true, write: true, own: false },
    { level: 'read', read: true, write: false, own: false },
    { level: 'stranger', read: false, write: false, own: false }
  ] as const;

  it.each(MATRIX)(
    'answers $level for read, write and owner',
    async ({ level, read, write, own }) => {
      context = await createTestContext();
      const cast = seedCast();
      const accountId =
        level === 'owner'
          ? cast.owner
          : level === 'write'
            ? cast.writer
            : level === 'read'
              ? cast.reader
              : cast.stranger;

      for (const [need, granted] of [
        [AccessNeed.Read, read],
        [AccessNeed.Write, write],
        [AccessNeed.Owner, own]
      ] as const) {
        const handler = vi.fn((access: PlaylistAccess) => access);
        const entry = playlistEntry(
          database(),
          cast.playlistId,
          accountId,
          need,
          handler
        );

        if (granted) {
          expect(entry).toEqual({
            outcome: EntryOutcome.Granted,
            value: level
          });
          expect(handler).toHaveBeenCalledTimes(1);
        } else {
          expect(entry).toEqual({ outcome: EntryOutcome.Denied });
          expect(handler).not.toHaveBeenCalled();
        }
      }
    }
  );
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
