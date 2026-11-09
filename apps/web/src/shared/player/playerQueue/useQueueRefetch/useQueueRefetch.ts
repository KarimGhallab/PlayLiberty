import { useEffect } from 'react';

import type { Playlist, PlaylistTrack } from '@playliberty/contracts';

import { usePlayerStore } from '../../playerStore/playerStore';
import { buildQueue } from '../playerQueue';

/* A tracks read feeds the live queue: arrivals append, gone tracks drop, and
 * the store refuses another playlist's read. Keyed on the read so merges wait. */
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
