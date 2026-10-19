import type { Playlist, PlaylistTrack } from '@playliberty/contracts';
import { TrackFileStatus } from '@playliberty/contracts';

import { randomTrack, usePlayerStore } from '../playerStore/playerStore';
import type { PlayerTrack } from '../types';

/*
 * The one place a playlist's tracks become a queue and are started, so three
 * controls agree on which tracks enter and which playlist they carry. Only
 * stored files enter; the name is carried because the queue persists.
 */

/* Whether a track can enter the queue. The filter and every control that asks
 * "is there anything to play" read this one rule. */
function isPlayable({ track }: PlaylistTrack): boolean {
  return track.fileStatus === TrackFileStatus.Stored;
}

export function buildQueue(
  tracks: readonly PlaylistTrack[],
  playlist: Pick<Playlist, 'id' | 'name'>
): PlayerTrack[] {
  return tracks.filter(isPlayable).map(({ track }) => ({
    id: track.id,
    title: track.title,
    playlistId: playlist.id,
    playlistName: playlist.name,
    durationSeconds: track.durationSeconds,
    thumbnailPath: track.thumbnailPath
  }));
}

/*
 * Whether a playlist has anything to play, answered from the counts a read
 * already carries rather than by reading the queue. A control that offers a
 * play reads this, so it cannot promise a queue the build would refuse.
 */
export function hasPlayableTrack(playlist: {
  readonly counts: Readonly<Record<TrackFileStatus, number>>;
}): boolean {
  return playlist.counts[TrackFileStatus.Stored] > 0;
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
