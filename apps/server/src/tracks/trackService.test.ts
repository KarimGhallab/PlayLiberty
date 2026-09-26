import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import {
  AssociationOrigin,
  Provider,
  ShareLevel,
  TrackFileStatus,
  UserRole
} from '@playliberty/contracts';

import type { DatabaseHandle } from '../db/client.js';
import {
  accounts,
  associations,
  playlists,
  shares,
  tracks
} from '../db/schema.js';
import { createTestContext } from '../testing/createTestContext.js';
import type { TestContext } from '../testing/createTestContext.js';
import {
  resolveTrackForStream,
  resolveTrackForThumbnail
} from './trackService.js';
import { TrackStreamOutcome, TrackThumbnailOutcome } from './types.js';

interface SeedTrackOptions {
  fileStatus?: TrackFileStatus;
  filePath?: string | null;
  thumbnailPath?: string | null;
}

interface SeededTrack {
  accountId: string;
  playlistId: string;
  trackId: string;
}

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

function createAccount(database: DatabaseHandle): string {
  const id = randomUUID();
  database.db
    .insert(accounts)
    .values({
      id,
      pangolinUserId: `pangolin-${id}`,
      displayName: 'Account',
      email: null,
      avatarUrl: null,
      role: UserRole.User
    })
    .run();
  return id;
}

function seedTrack(
  database: DatabaseHandle,
  options: SeedTrackOptions = {}
): SeededTrack {
  const accountId = createAccount(database);
  const playlistId = randomUUID();
  const trackId = randomUUID();

  database.db
    .insert(playlists)
    .values({
      id: playlistId,
      ownerAccountId: accountId,
      name: 'Playlist',
      coverUrl: null,
      provider: Provider.Youtube,
      sourcePlaylistId: `source-${playlistId}`
    })
    .run();

  database.db
    .insert(tracks)
    .values({
      id: trackId,
      provider: Provider.Youtube,
      videoId: `video-${trackId}`,
      title: 'Track',
      durationSeconds: null,
      thumbnailPath: options.thumbnailPath ?? null,
      fileStatus: options.fileStatus ?? TrackFileStatus.Pending,
      filePath: options.filePath ?? null
    })
    .run();

  database.db
    .insert(associations)
    .values({
      id: randomUUID(),
      playlistId,
      trackId,
      origin: AssociationOrigin.Manual,
      position: 0
    })
    .run();

  return { accountId, playlistId, trackId };
}

describe('trackService', () => {
  it('reports an unknown track as not found', async () => {
    context = await createTestContext();

    const result = resolveTrackForStream(
      context.database,
      randomUUID(),
      randomUUID()
    );

    expect(result.outcome).toBe(TrackStreamOutcome.NotFound);
  });

  it('forbids an account with no association to the track', async () => {
    context = await createTestContext();
    const seeded = seedTrack(context.database, {
      fileStatus: TrackFileStatus.Stored,
      filePath: 'media/ab/video.m4a'
    });

    const result = resolveTrackForStream(
      context.database,
      seeded.trackId,
      randomUUID()
    );

    expect(result.outcome).toBe(TrackStreamOutcome.Forbidden);
  });

  it('returns the file path for a stored track the account owns', async () => {
    context = await createTestContext();
    const seeded = seedTrack(context.database, {
      fileStatus: TrackFileStatus.Stored,
      filePath: 'media/ab/video.m4a'
    });

    const result = resolveTrackForStream(
      context.database,
      seeded.trackId,
      seeded.accountId
    );

    expect(result).toEqual({
      outcome: TrackStreamOutcome.Ok,
      filePath: 'media/ab/video.m4a'
    });
  });

  it('reports an associated track that is not stored yet', async () => {
    context = await createTestContext();
    const seeded = seedTrack(context.database, {
      fileStatus: TrackFileStatus.Pending
    });

    const result = resolveTrackForStream(
      context.database,
      seeded.trackId,
      seeded.accountId
    );

    expect(result.outcome).toBe(TrackStreamOutcome.NotStored);
  });

  it('grants access through a share', async () => {
    context = await createTestContext();
    const seeded = seedTrack(context.database, {
      fileStatus: TrackFileStatus.Stored,
      filePath: 'media/ab/video.m4a'
    });
    const viewerId = createAccount(context.database);
    context.database.db
      .insert(shares)
      .values({
        id: randomUUID(),
        playlistId: seeded.playlistId,
        accountId: viewerId,
        level: ShareLevel.Read
      })
      .run();

    const result = resolveTrackForStream(
      context.database,
      seeded.trackId,
      viewerId
    );

    expect(result.outcome).toBe(TrackStreamOutcome.Ok);
  });

  it('reports a thumbnail as not found when the track has none', async () => {
    context = await createTestContext();
    const seeded = seedTrack(context.database);

    const result = resolveTrackForThumbnail(
      context.database,
      seeded.trackId,
      seeded.accountId
    );

    expect(result.outcome).toBe(TrackThumbnailOutcome.NotFound);
  });

  it('returns the thumbnail path to an authorized account', async () => {
    context = await createTestContext();
    const seeded = seedTrack(context.database, {
      thumbnailPath: 'thumbnails/ab/video.jpg'
    });

    const result = resolveTrackForThumbnail(
      context.database,
      seeded.trackId,
      seeded.accountId
    );

    expect(result).toEqual({
      outcome: TrackThumbnailOutcome.Ok,
      thumbnailPath: 'thumbnails/ab/video.jpg'
    });
  });
});
