import type { PlaylistTrack } from '@playliberty/contracts';
import { TrackFileStatus } from '@playliberty/contracts';

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
 * A track enters the queue exactly when its file is stored, which is the same
 * fact the track list draws its play control from. Filtering here rather than in
 * the store is what keeps the two surfaces agreeing by construction: a queue can
 * never hold an entry the list would not offer. A track that loses its file after
 * it is queued is dropped when it is reached, which is a failure the map cannot
 * see and the element reports instead.
 */
export function toPlayerTracks(
  tracks: readonly PlaylistTrack[],
  playlistId: string,
  playlistName: string
): PlayerTrack[] {
  return tracks
    .filter(({ track }) => track.fileStatus === TrackFileStatus.Stored)
    .map(({ track }) => ({
      id: track.id,
      title: track.title,
      playlistId,
      playlistName,
      durationSeconds: track.durationSeconds,
      thumbnailPath: track.thumbnailPath
    }));
}
