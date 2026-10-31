import { useQuery } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { playlistQueueKey } from '@playliberty/query';

import { apiClient } from './client';

/** The playlist's playable order, the source of a row's queue. */
export function usePlaylistQueue(playlistId: string | null, enabled = true) {
  return useQuery({
    queryKey: playlistQueueKey(playlistId ?? ''),
    queryFn: () => {
      if (playlistId === null) {
        throw new Error('A playlist queue read needs an id.');
      }

      return apiClient.send(endpoints.playlistQueue, { playlistId });
    },
    enabled: playlistId !== null && enabled
  });
}
