import { AddTrackOutcome, AssociationOrigin } from '@playliberty/contracts';
import type { AddTrackResult } from '@playliberty/contracts';
import type { YoutubeUrlInfo } from '@playliberty/youtube';

import { canWritePlaylist } from '../../shared/access/playlistAccess.js';
import type { AppContext } from '../../shared/context.js';

import {
  AssociationOutcome,
  addAssociation,
  nextPositionFor
} from '../playlists/associationService.js';
import { createPendingTrack, findTrackByVideoId } from './trackService.js';

/*
 * Adding one pasted video to several playlists at once.
 *
 * The request names the video by URL and the playlists by id, and the answer is
 * one outcome per playlist in the order the ids were sent, so a client can report
 * against the list the user chose from. A refusal carries no reason: a playlist
 * the account cannot see, one it cannot write, one that was deleted and one whose
 * share was revoked are one answer, or the batch would be a way to learn which
 * playlist ids exist.
 *
 * The video is resolved once and one track results. A track is created only when
 * at least one playlist will take it, so a batch every playlist refuses does not
 * queue a download nobody asked for, and a video the instance already holds is
 * reused untouched, without a second read of the source. That reuse is the one way
 * this differs from the sync, which re-queues a failed track instead of leaving it.
 */
export async function addTrackToPlaylists(
  context: AppContext,
  accountId: string,
  info: YoutubeUrlInfo,
  playlistIds: string[]
): Promise<AddTrackResult> {
  const database = context.database;
  const writable = playlistIds.map(playlistId =>
    canWritePlaylist(database, playlistId, accountId)
  );

  let trackId: string | null = null;

  if (writable.some(allowed => allowed)) {
    const existing = findTrackByVideoId(database, info.sourceId);

    if (existing !== undefined) {
      trackId = existing.id;
    } else {
      const source = await context.youtube.listSource(info.url);
      const entry = source.entries[0];

      if (entry === undefined) {
        throw new Error('The adapter returned no video for a video URL.');
      }

      trackId = createPendingTrack(database, {
        videoId: info.sourceId,
        title: entry.title,
        durationSeconds: entry.durationSeconds,
        thumbnailUrl: entry.thumbnailUrl
      });
    }
  }

  const results = playlistIds.map((playlistId, index) => {
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
  });

  return { results };
}

/*
 * `addAssociation` can also answer removed or absent, which a call that only adds
 * cannot reach. Mapping them to a silent added would hide a bug, so they throw.
 */
function toAddTrackOutcome(outcome: AssociationOutcome): AddTrackOutcome {
  if (outcome === AssociationOutcome.Added) {
    return AddTrackOutcome.Added;
  }

  if (outcome === AssociationOutcome.AlreadyPresent) {
    return AddTrackOutcome.AlreadyPresent;
  }

  throw new Error(`Unexpected association outcome: ${outcome}`);
}
