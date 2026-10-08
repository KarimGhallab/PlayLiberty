import type { Playlist, PlaylistTrack } from '@playliberty/contracts';
import { TrackFileStatus } from '@playliberty/contracts';

import { usePlayerStore } from '../playerStore/playerStore';
import type { PlayerTrack } from '../types';

/*
 * The one place a playlist's tracks become a queue, and the one place that queue
 * is started. The detail's play control, a row press and the shuffle control all
 * cross this seam, so the three cannot disagree about which tracks enter, which
 * playlist they are stamped with or which one a fresh queue starts on.
 *
 * The server's track page becomes the queue's entries: the playlist id and name
 * are stamped on every entry once, so the store and the bar never have to know
 * which playlist a bare `Track` came from. The name is carried rather than looked
 * up later because the queue is persisted: a relaunch has no library in memory
 * and the media session can fetch nothing, so a source named at play time is a
 * source unnamed after a reload.
 *
 * A track enters the queue exactly when its file is stored, which is the same
 * fact the track list draws its play control from. Filtering here rather than in
 * the store is what keeps the two surfaces agreeing by construction: a queue can
 * never hold an entry the list would not offer. A track that loses its file after
 * it is queued is dropped when it is reached, which is a failure the map cannot
 * see and the element reports instead.
 */
export function buildQueue(
  tracks: readonly PlaylistTrack[],
  playlist: Pick<Playlist, 'id' | 'name'>
): PlayerTrack[] {
  return tracks
    .filter(({ track }) => track.fileStatus === TrackFileStatus.Stored)
    .map(({ track }) => ({
      id: track.id,
      title: track.title,
      playlistId: playlist.id,
      playlistName: playlist.name,
      durationSeconds: track.durationSeconds,
      thumbnailPath: track.thumbnailPath
    }));
}

/*
 * Build one playlist's queue and start it. `startTrackId` is the track to begin
 * on, or null for the first playable one; `shuffle` is the mode the new queue is
 * drawn in. Returns false when there is nothing to play, which is the refusal the
 * shuffle control reports and the detail's controls never reach, because they
 * already hold a list.
 */
export function startPlaylistQueue(
  playlist: Pick<Playlist, 'id' | 'name'>,
  tracks: readonly PlaylistTrack[],
  startTrackId: string | null,
  shuffle = false
): boolean {
  const queue = buildQueue(tracks, playlist);
  const start = startTrackId ?? queue[0]?.id;

  if (start === undefined || !queue.some(track => track.id === start)) {
    return false;
  }

  usePlayerStore.getState().startQueue(playlist.id, queue, start, shuffle);
  return true;
}
