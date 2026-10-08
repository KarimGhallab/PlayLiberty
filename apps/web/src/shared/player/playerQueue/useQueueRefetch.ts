import { useEffect } from 'react';

import type { Playlist, PlaylistTrack } from '@playliberty/contracts';

import { usePlayerStore } from '../playerStore/playerStore';
import { buildQueue } from './playerQueue';

/*
 * The refetch seam. A tracks read's data is handed here and fed into the live
 * queue, so a track arriving from a sync appends and a track that is gone drops,
 * with the current track surviving. The store refuses a refetch of a playlist the
 * queue is not on, so a read for another playlist leaves the queue alone.
 *
 * The read's data is the effect's dependency: the merge happens when the server
 * answers again, not on every render. The first answer of a visit merges too,
 * which is a no-op when the queue was built from the same list and an update when
 * the list moved while the tab was away.
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
