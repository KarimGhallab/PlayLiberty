import { eq } from 'drizzle-orm';

import type { AddTrackResult } from '@playliberty/contracts';
import { AddTrackOutcome, AssociationOrigin } from '@playliberty/contracts';
import type { YoutubeUrlInfo } from '@playliberty/youtube';

import {
  AccessNeed,
  EntryOutcome,
  playlistEntry
} from '../../shared/access/entry/entry.js';
import type { AppContext } from '../../shared/context.js';
import { ChangeKind, announce } from '../../shared/events/liveEvents.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { playlists } from '../../platform/database/schema.js';
import {
  AssociationOutcome,
  addAssociation,
  nextPositionFor
} from '../playlists/associationService.js';
import { withDownloadQueue } from './downloadQueue/downloadQueue.js';
import { findTrackByVideoId } from './service/trackService.js';
import type { TrackSeed } from './types.js';

/*
 * Add a pasted video to several playlists: one outcome per playlist, in request
 * order. A refusal carries no reason, else the batch reveals which ids exist.
 * The video resolves once; a track is created only if some playlist takes it.
 */
export async function addTrackToPlaylists(
  context: AppContext,
  accountId: string,
  info: YoutubeUrlInfo,
  playlistIds: string[]
): Promise<AddTrackResult> {
  const database = context.database;
  const writable = playlistIds.map(
    playlistId =>
      playlistEntry(
        database,
        playlistId,
        accountId,
        AccessNeed.Write,
        () => true
      ).outcome === EntryOutcome.Granted
  );

  /* The source is read before the queue opens, so everything inside is one
   * synchronous move. */
  let seed: TrackSeed | null = null;
  let existingTrackId: string | null = null;

  if (writable.some(allowed => allowed)) {
    const existing = findTrackByVideoId(database, info.sourceId);

    if (existing !== undefined) {
      existingTrackId = existing.id;
    } else {
      const source = await context.youtube.listSource(info.url);
      const entry = source.entries[0];

      if (entry === undefined) {
        throw new Error('The adapter returned no video for a video URL.');
      }

      seed = {
        videoId: info.sourceId,
        title: entry.title,
        durationSeconds: entry.durationSeconds,
        thumbnailUrl: entry.thumbnailUrl,
        skipNonMusic: firstWritableSkipNonMusic(
          database,
          playlistIds[writable.indexOf(true)]
        )
      };
    }
  }

  const result = withDownloadQueue(context, queue =>
    database.unitOfWork(() => {
      const trackId = seed === null ? existingTrackId : queue.create(seed);

      return {
        results: playlistIds.map((playlistId, index) => {
          if (writable[index] !== true || trackId === null) {
            return { playlistId, outcome: AddTrackOutcome.Refused };
          }

          const outcome = addAssociation(database, {
            playlistId,
            trackId,
            origin: AssociationOrigin.Manual,
            position: nextPositionFor(database, playlistId)
          });

          return { playlistId, outcome: toAddTrackOutcome(outcome) };
        })
      };
    })
  );

  const addedPlaylistIds = result.results
    .filter(entry => entry.outcome === AddTrackOutcome.Added)
    .map(entry => entry.playlistId);

  if (addedPlaylistIds.length > 0) {
    announce(context, {
      kind: ChangeKind.TracksChangedForPlaylists,
      playlistIds: addedPlaylistIds
    });
  }

  return result;
}

/* The first writable playlist's value, in request order. The fallback is
 * unreachable, since the index is only taken when a playlist is writable. */
function firstWritableSkipNonMusic(
  database: DatabaseHandle,
  playlistId: string | undefined
): boolean {
  if (playlistId === undefined) {
    return true;
  }

  return (
    database.db
      .select({ skipNonMusic: playlists.skipNonMusic })
      .from(playlists)
      .where(eq(playlists.id, playlistId))
      .get()?.skipNonMusic ?? true
  );
}

/* `addAssociation` can also answer removed or absent; those cannot come from an
 * add, so they throw rather than hide a bug. */
function toAddTrackOutcome(outcome: AssociationOutcome): AddTrackOutcome {
  if (outcome === AssociationOutcome.Added) {
    return AddTrackOutcome.Added;
  }

  if (outcome === AssociationOutcome.AlreadyPresent) {
    return AddTrackOutcome.AlreadyPresent;
  }

  throw new Error(`Unexpected association outcome: ${outcome}`);
}
