import { useEffect } from 'react';

import type { Playlist, PlaylistTrack } from '@playliberty/contracts';

import { usePlayerStore } from '../playerStore/playerStore';
import { buildQueue } from './playerQueue';

/*
 * The refetch seam: a tracks read's data feeds the live queue, so an arrival
 * appends and a gone track drops; the store refuses another playlist's read.
 * The read is the effect's dependency, so the merge waits for the next answer.
 */
export function useQueueRefetch(
  playlist: Pick<Playlist, 'id' | 'name'> | undefined,
  tracks: readonly PlaylistTrack[] | undefined
): void {
  useEffect(() => {
    if (playlist === undefined || tracks === undefined) {
      return;
    }

    usePlayerStore
      .getState()
      .applyRefetch(playlist.id, buildQueue(tracks, playlist));
  }, [playlist, tracks]);
}
