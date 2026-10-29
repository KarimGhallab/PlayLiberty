import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { AssociationOrigin, TrackFileStatus } from '@playliberty/contracts';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';
import {
  associate,
  seedAccount,
  seedPlaylist,
  seedTrack
} from '../../../app/testing/fixtures.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import { TrackStreamOutcome, TrackThumbnailOutcome } from '../types.js';
import {
  resolveTrack,
  resolveTrackForStream,
  resolveTrackForThumbnail
} from './trackService.js';

interface SeedOwnedTrackOptions {
  fileStatus?: TrackFileStatus;
  filePath?: string | null;
  thumbnailPath?: string | null;
}

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

/*
 * Owned track this suite reads: an account owning a playlist that holds it, the
 * association manual at position zero, as an owner adding a track produces.
 */
function seedOwnedTrack(
  database: DatabaseHandle,
  options: SeedOwnedTrackOptions = {}
): { accountId: string; playlistId: string; trackId: string } {
  const account = seedAccount(database);
  const playlist = seedPlaylist(database, account.accountId);
  const track = seedTrack(database, {
    durationSeconds: null,
    fileStatus: options.fileStatus ?? TrackFileStatus.Pending,
    filePath: options.filePath,
    thumbnailPath: options.thumbnailPath
  });

  associate(database, playlist.playlistId, track.trackId, {
    origin: AssociationOrigin.Manual,
    position: 0
  });

  return {
    accountId: account.accountId,
    playlistId: playlist.playlistId,
    trackId: track.trackId
  };
}

describe('trackService', () => {
  it('reads a track by id without an association', async () => {
    context = await createTestContext();
    const track = seedTrack(context.database, {
      fileStatus: TrackFileStatus.Stored,
      filePath: 'media/ab/video.m4a'
    });

    const result = resolveTrack(context.database, track.trackId);

    expect(result?.id).toBe(track.trackId);
    expect(result?.fileStatus).toBe(TrackFileStatus.Stored);
    /* The media path stays off the wire. */
    expect(result).not.toHaveProperty('filePath');
  });

  it('reports an unknown track id as undefined', async () => {
    context = await createTestContext();

    expect(resolveTrack(context.database, randomUUID())).toBeUndefined();
  });

  it('reports an unknown track as not found', async () => {
    context = await createTestContext();

    const result = resolveTrackForStream(context.database, randomUUID());

    expect(result.outcome).toBe(TrackStreamOutcome.NotFound);
  });

  it('returns the file path for a stored track', async () => {
    context = await createTestContext();
    const seeded = seedOwnedTrack(context.database, {
      fileStatus: TrackFileStatus.Stored,
      filePath: 'media/ab/video.m4a'
    });

    const result = resolveTrackForStream(context.database, seeded.trackId);

    expect(result).toEqual({
      outcome: TrackStreamOutcome.Ok,
      filePath: 'media/ab/video.m4a'
    });
  });

  it('reports a track that is not stored yet', async () => {
    context = await createTestContext();
    const seeded = seedOwnedTrack(context.database, {
      fileStatus: TrackFileStatus.Pending
    });

    const result = resolveTrackForStream(context.database, seeded.trackId);

    expect(result.outcome).toBe(TrackStreamOutcome.NotStored);
  });

  it('reports a thumbnail as not found when the track has none', async () => {
    context = await createTestContext();
    const seeded = seedOwnedTrack(context.database);

    const result = resolveTrackForThumbnail(context.database, seeded.trackId);

    expect(result.outcome).toBe(TrackThumbnailOutcome.NotFound);
  });

  it('returns the thumbnail path', async () => {
    context = await createTestContext();
    const seeded = seedOwnedTrack(context.database, {
      thumbnailPath: 'thumbnails/ab/video.jpg'
    });

    const result = resolveTrackForThumbnail(context.database, seeded.trackId);

    expect(result).toEqual({
      outcome: TrackThumbnailOutcome.Ok,
      thumbnailPath: 'thumbnails/ab/video.jpg'
    });
  });
});
