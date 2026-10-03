import type { PlaylistTrack } from '@playliberty/contracts';

import type { PlayerTrack } from './types';

/*
 * The server's track page becomes the queue's entries. The playlist id and name
 * are stamped on every entry here, once, so the store and the bar never have to
 * know which playlist a bare `Track` came from; the arguments are the playlist the
 * queue is being built from, which the four-oh-four-free read already scoped.
 *
 * The name is carried rather than looked up later because the queue is persisted:
 * a relaunch has no library in memory and the media session can fetch nothing, so
 * a source named at play time is a source unnamed after a reload.
 *
 * The mapping is deliberately total: every association becomes an entry, including
 * one whose file has not arrived. Whether a track is playable is a separate
 * decision with its own ticket, because a queue that silently filtered here would
 * make "why is this track missing" unanswerable from the queue alone.
 */
export function toPlayerTracks(
  tracks: readonly PlaylistTrack[],
  playlistId: string,
  playlistName: string
): PlayerTrack[] {
  return tracks.map(({ track }) => ({
    id: track.id,
    title: track.title,
    playlistId,
    playlistName,
    durationSeconds: track.durationSeconds,
    thumbnailPath: track.thumbnailPath
  }));
}
