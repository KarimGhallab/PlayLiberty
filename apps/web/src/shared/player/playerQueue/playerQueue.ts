import type { Playlist, PlaylistTrack } from '@playliberty/contracts';

import { isPlayable } from '../playable';
import { randomTrack, usePlayerStore } from '../playerStore/playerStore';
import type { PlayerTrack } from '../types';

/*
 * The one place a playlist's tracks become a queue and are started, so three
 * controls agree on which tracks enter and which playlist they carry. Only
 * stored files enter; the name is carried because the queue persists.
 */

export function buildQueue(
  tracks: readonly PlaylistTrack[],
  playlist: Pick<Playlist, 'id' | 'name'>
): PlayerTrack[] {
  return tracks
    .filter(({ track }) => isPlayable(track))
    .map(({ track }) => ({
      id: track.id,
      title: track.title,
      playlistId: playlist.id,
      playlistName: playlist.name,
      durationSeconds: track.durationSeconds,
      thumbnailPath: track.thumbnailPath
    }));
}

/* Build and start one playlist's queue. `startTrackId` null begins on the first
 * playable one (a random draw when shuffled); false means nothing to play. */
export function startPlaylistQueue(
  playlist: Pick<Playlist, 'id' | 'name'>,
  tracks: readonly PlaylistTrack[],
  startTrackId: string | null,
  shuffle = false
): boolean {
  const queue = buildQueue(tracks, playlist);
  const start =
    startTrackId ?? (shuffle ? randomTrack(queue)?.id : queue[0]?.id);

  if (start === undefined || !queue.some(track => track.id === start)) {
    return false;
  }

  usePlayerStore.getState().startQueue(playlist.id, queue, start, shuffle);
  return true;
}
