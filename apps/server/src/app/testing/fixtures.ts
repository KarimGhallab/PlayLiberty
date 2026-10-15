import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  AssociationOrigin,
  PlaylistSort,
  PlaylistSyncStatus,
  Provider,
  ShareLevel,
  SyncRunStatus,
  TrackFileStatus,
  TrackSourceStatus,
  UserRole
} from '@playliberty/contracts';

import { nextPositionFor } from '../../features/playlists/associationService.js';
import type { DatabaseHandle } from '../../platform/database/client.js';
import {
  accounts,
  associations,
  playlists,
  shares,
  syncRuns,
  tracks
} from '../../platform/database/schema.js';
import {
  mediaRelativePath,
  thumbnailRelativePath
} from '../../platform/media/mediaPaths.js';
import type { TestContext } from './createTestContext.js';

/*
 * The test data builders, one owner for the schema defaults every suite was
 * restating. A builder inserts with raw drizzle and never through a service, so a
 * service bug cannot hide behind a green fixture; the one suite that exercises a
 * service calls it explicitly. The playlist association is a separate call
 * because a track is server-wide and the membership is often the thing under
 * test.
 *
 * The chosen defaults are the common case for a fixture: a stored track of
 * three minutes, a playlist nobody has shared, a read share. A test that needs
 * another value passes the option rather than restating the columns.
 */

export interface SeededAccount {
  accountId: string;
  pangolinUserId: string;
  displayName: string;
}

export interface SeededPlaylist {
  playlistId: string;
  ownerAccountId: string;
}

export interface SeededTrack {
  trackId: string;
  videoId: string;
}

export interface SeededStoredTrack {
  account: SeededAccount;
  playlist: SeededPlaylist;
  track: SeededTrack;
}

export interface SeedAccountOptions {
  pangolinUserId?: string;
  displayName?: string;
  email?: string | null;
  role?: UserRole;
}

export interface SeedPlaylistOptions {
  name?: string;
  sourcePlaylistId?: string;
  sourceUrl?: string | null;
  syncStatus?: PlaylistSyncStatus;
  skipNonMusic?: boolean;
  sort?: PlaylistSort | null;
  lastSyncedAt?: string | null;
  createdAt?: string;
}

export interface SeedTrackOptions {
  videoId?: string;
  title?: string;
  durationSeconds?: number | null;
  skipNonMusic?: boolean;
  thumbnailUrl?: string | null;
  thumbnailPath?: string | null;
  fileStatus?: TrackFileStatus;
  sourceStatus?: TrackSourceStatus;
  filePath?: string | null;
  failureReason?: string | null;
}

export interface AssociateOptions {
  origin?: AssociationOrigin;
  position?: number;
  addedAt?: string;
}

export interface SeedShareOptions {
  level?: ShareLevel;
}

export interface SeedSyncRunOptions {
  status?: SyncRunStatus;
  addedCount?: number;
  retainedCount?: number;
  removedCount?: number;
  failedCount?: number;
  startedAt?: string;
  finishedAt?: string | null;
  error?: string | null;
}

export interface SeedStoredTrackOptions {
  account?: SeededAccount;
  playlist?: SeededPlaylist;
  videoId?: string;
  title?: string;
  durationSeconds?: number | null;
  skipNonMusic?: boolean;
}

export function seedAccount(
  database: DatabaseHandle,
  options: SeedAccountOptions = {}
): SeededAccount {
  const accountId = randomUUID();
  const pangolinUserId = options.pangolinUserId ?? `pangolin-${accountId}`;
  const displayName = options.displayName ?? 'Account';

  database.db
    .insert(accounts)
    .values({
      id: accountId,
      pangolinUserId,
      displayName,
      email: options.email ?? null,
      avatarUrl: null,
      role: options.role ?? UserRole.User
    })
    .run();

  return { accountId, pangolinUserId, displayName };
}

export function seedPlaylist(
  database: DatabaseHandle,
  ownerAccountId: string,
  options: SeedPlaylistOptions = {}
): SeededPlaylist {
  const playlistId = randomUUID();

  database.db
    .insert(playlists)
    .values({
      id: playlistId,
      ownerAccountId,
      name: options.name ?? 'Playlist',
      provider: Provider.Youtube,
      sourcePlaylistId: options.sourcePlaylistId ?? `source-${playlistId}`,
      sourceUrl: options.sourceUrl ?? null,
      syncStatus: options.syncStatus ?? PlaylistSyncStatus.Idle,
      skipNonMusic: options.skipNonMusic ?? true,
      sort: options.sort ?? null,
      lastSyncedAt: options.lastSyncedAt ?? null,
      createdAt: options.createdAt ?? new Date().toISOString()
    })
    .run();

  return { playlistId, ownerAccountId };
}

export function seedTrack(
  database: DatabaseHandle,
  options: SeedTrackOptions = {}
): SeededTrack {
  const trackId = randomUUID();
  const videoId = options.videoId ?? `video-${trackId}`;

  database.db
    .insert(tracks)
    .values({
      id: trackId,
      provider: Provider.Youtube,
      videoId,
      title: options.title ?? 'Track',
      durationSeconds:
        options.durationSeconds === undefined ? 180 : options.durationSeconds,
      skipNonMusic: options.skipNonMusic ?? true,
      thumbnailPath: options.thumbnailPath ?? null,
      thumbnailUrl: options.thumbnailUrl ?? null,
      fileStatus: options.fileStatus ?? TrackFileStatus.Stored,
      sourceStatus: options.sourceStatus ?? TrackSourceStatus.Available,
      filePath: options.filePath ?? null,
      failureReason: options.failureReason ?? null
    })
    .run();

  return { trackId, videoId };
}

export function associate(
  database: DatabaseHandle,
  playlistId: string,
  trackId: string,
  options: AssociateOptions = {}
): void {
  database.db
    .insert(associations)
    .values({
      id: randomUUID(),
      playlistId,
      trackId,
      origin: options.origin ?? AssociationOrigin.Remote,
      position: options.position ?? nextPositionFor(database, playlistId),
      addedAt: options.addedAt
    })
    .run();
}

export function seedShare(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string,
  options: SeedShareOptions = {}
): void {
  database.db
    .insert(shares)
    .values({
      id: randomUUID(),
      playlistId,
      accountId,
      level: options.level ?? ShareLevel.Read
    })
    .run();
}

export function seedSyncRun(
  database: DatabaseHandle,
  playlistId: string,
  options: SeedSyncRunOptions = {}
): { runId: string } {
  const runId = randomUUID();

  database.db
    .insert(syncRuns)
    .values({
      id: runId,
      playlistId,
      status: options.status ?? SyncRunStatus.Completed,
      addedCount: options.addedCount ?? 0,
      retainedCount: options.retainedCount ?? 0,
      removedCount: options.removedCount ?? 0,
      failedCount: options.failedCount ?? 0,
      startedAt: options.startedAt ?? new Date().toISOString(),
      finishedAt: options.finishedAt ?? null,
      error: options.error ?? null
    })
    .run();

  return { runId };
}

/*
 * A stored track with a real file and thumbnail, for a suite that streams: the
 * two media routes need something on disk to send. It is the one composite,
 * because five suites were each building the same account, playlist, track,
 * association and pair of files by hand. It creates whatever it is not given.
 */
export async function seedStoredTrack(
  context: TestContext,
  options: SeedStoredTrackOptions = {}
): Promise<SeededStoredTrack> {
  const database = context.database;
  const account = options.account ?? seedAccount(database);
  const playlist =
    options.playlist ?? seedPlaylist(database, account.accountId);
  const videoId = options.videoId ?? `video-${randomUUID()}`;

  const filePath = mediaRelativePath(videoId, '.m4a');
  const thumbnailPath = thumbnailRelativePath(videoId);

  const track = seedTrack(database, {
    videoId,
    title: options.title,
    durationSeconds: options.durationSeconds,
    skipNonMusic: options.skipNonMusic,
    fileStatus: TrackFileStatus.Stored,
    filePath,
    thumbnailPath
  });

  associate(database, playlist.playlistId, track.trackId);

  await writeMediaFile(context.mediaPaths.root, filePath, 'the-audio');
  await writeMediaFile(context.mediaPaths.root, thumbnailPath, 'the-picture');

  return { account, playlist, track };
}

async function writeMediaFile(
  root: string,
  relative: string,
  contents: string
): Promise<void> {
  const absolute = join(root, relative);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, contents);
}
