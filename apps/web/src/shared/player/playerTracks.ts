import type { PlaylistTrack } from '@playliberty/contracts';

import type { PlayerTrack } from './types';

/*
 * The server's track page becomes the queue's entries. The playlist id is stamped
 * on every entry here, once, so the store and the bar never have to know which
 * playlist a bare `Track` came from; the argument is the playlist the queue is
 * being built from, which the four-oh-four-free read already scoped.
 *
 * The mapping is deliberately total: every association becomes an entry, including
 * one whose file has not arrived. Whether a track is playable is a separate
 * decision with its own ticket, because a queue that silently filtered here would
 * make "why is this track missing" unanswerable from the queue alone.
 */
export function toPlayerTracks(
  tracks: readonly PlaylistTrack[],
  playlistId: string
): PlayerTrack[] {
  return tracks.map(({ track }) => ({
    id: track.id,
    title: track.title,
    playlistId,
    durationSeconds: track.durationSeconds,
    thumbnailPath: track.thumbnailPath
  }));
}
