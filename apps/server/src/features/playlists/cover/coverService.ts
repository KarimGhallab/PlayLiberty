import { randomUUID } from 'node:crypto';
import { rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';

import {
  AccessNeed,
  EntryOutcome,
  playlistEntry
} from '../../../shared/access/entry.js';
import type { AppContext } from '../../../shared/context.js';
import { ChangeKind, announce } from '../../../shared/events/liveEvents.js';
import { Refusal } from '../../../shared/refusal.js';

import { playlists } from '../../../platform/database/schema.js';
import { coverRelativePath } from '../../../platform/media/mediaPaths.js';
import { PlaylistOutcome, readPlaylistForAccount } from '../playlistService.js';
import {
  InvalidCoverImageError,
  normalizeCoverImage
} from './normalizeCoverImage.js';
import type {
  CoverCrop,
  ReadPlaylistCoverResult,
  RemovePlaylistCoverResult,
  SetPlaylistCoverResult
} from './types.js';

/* Every upload gets a later version than the one it replaces, even when two
 * happen inside the same millisecond. */
function nextCoverVersion(previous: string | null): string {
  const previousMs = previous === null ? Number.NaN : Date.parse(previous);
  const now = Date.now();
  const next = Number.isNaN(previousMs) ? now : Math.max(now, previousMs + 1);

  return new Date(next).toISOString();
}

export async function setPlaylistCoverForAccount(
  context: AppContext,
  playlistId: string,
  accountId: string,
  image: Buffer,
  crop: CoverCrop | null = null
): Promise<SetPlaylistCoverResult> {
  const entry = playlistEntry(
    context.database,
    playlistId,
    accountId,
    AccessNeed.Write,
    () =>
      context.database.db
        .select()
        .from(playlists)
        .where(eq(playlists.id, playlistId))
        .get() ?? null
  );

  if (entry.outcome === EntryOutcome.Denied || entry.value === null) {
    return { outcome: 'refused', refusal: Refusal.PlaylistNotFoundWrite };
  }

  const previous = entry.value;

  let normalized: Buffer;

  try {
    normalized = await normalizeCoverImage(image, crop);
  } catch (error) {
    if (error instanceof InvalidCoverImageError) {
      return { outcome: 'refused', refusal: Refusal.CoverInvalidImage };
    }

    throw error;
  }

  const token = randomUUID();
  const coverPath = coverRelativePath(playlistId, token);
  const finalPath = join(context.mediaPaths.root, coverPath);
  const temporaryPath = join(context.mediaPaths.tempDir, `${token}.webp`);

  try {
    await writeFile(temporaryPath, normalized);
    await rename(temporaryPath, finalPath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }

  const coverUpdatedAt = nextCoverVersion(previous.coverUpdatedAt);

  try {
    context.database.db
      .update(playlists)
      .set({ coverPath, coverUpdatedAt })
      .where(eq(playlists.id, playlistId))
      .run();
  } catch (error) {
    await rm(finalPath, { force: true }).catch(() => undefined);
    throw error;
  }

  if (previous.coverPath !== null) {
    await rm(join(context.mediaPaths.root, previous.coverPath), {
      force: true
    }).catch(() => undefined);
  }

  const playlist = readPlaylistForAccount(
    context.database,
    playlistId,
    accountId
  );

  if (playlist.outcome !== PlaylistOutcome.Ok) {
    throw new Error('the uploaded cover lost its playlist');
  }

  announce(context, { kind: ChangeKind.PlaylistChanged, playlistId });

  return { outcome: 'ok', playlist: playlist.playlist };
}

export async function removePlaylistCoverForAccount(
  context: AppContext,
  playlistId: string,
  accountId: string
): Promise<RemovePlaylistCoverResult> {
  const entry = playlistEntry(
    context.database,
    playlistId,
    accountId,
    AccessNeed.Write,
    () =>
      context.database.db
        .select({ coverPath: playlists.coverPath })
        .from(playlists)
        .where(eq(playlists.id, playlistId))
        .get() ?? null
  );

  if (entry.outcome === EntryOutcome.Denied || entry.value === null) {
    return { outcome: 'refused', refusal: Refusal.PlaylistNotFoundWrite };
  }

  const coverPath = entry.value.coverPath;

  /* No cover is the state the caller asked for, so the delete is a no-op and
   * publishes nothing. */
  if (coverPath === null) {
    return { outcome: 'ok' };
  }

  context.database.db
    .update(playlists)
    .set({ coverPath: null, coverUpdatedAt: null })
    .where(eq(playlists.id, playlistId))
    .run();

  /* The row is cleared first, so a file that survives is unreferenced and the
   * weekly sweep reclaims it. */
  await rm(join(context.mediaPaths.root, coverPath), {
    force: true
  }).catch(() => undefined);

  announce(context, { kind: ChangeKind.PlaylistChanged, playlistId });

  return { outcome: 'ok' };
}

export async function readPlaylistCoverForAccount(
  context: AppContext,
  playlistId: string,
  accountId: string
): Promise<ReadPlaylistCoverResult> {
  const entry = playlistEntry(
    context.database,
    playlistId,
    accountId,
    AccessNeed.Read,
    () =>
      context.database.db
        .select({ coverPath: playlists.coverPath })
        .from(playlists)
        .where(eq(playlists.id, playlistId))
        .get() ?? null
  );

  if (entry.outcome === EntryOutcome.Denied || entry.value === null) {
    return { outcome: 'refused', refusal: Refusal.PlaylistNotFoundRead };
  }

  if (entry.value.coverPath === null) {
    return { outcome: 'refused', refusal: Refusal.CoverNotFound };
  }

  const file = await stat(
    join(context.mediaPaths.root, entry.value.coverPath)
  ).catch(() => null);

  if (file === null || !file.isFile()) {
    return { outcome: 'refused', refusal: Refusal.CoverNotFound };
  }

  return {
    outcome: 'ok',
    coverPath: entry.value.coverPath
  };
}
