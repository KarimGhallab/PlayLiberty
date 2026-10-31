import { useQuery } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { playlistKey } from '@playliberty/query';

import { apiClient } from './client';

/** The playlist the detail names; `null` disables the read. */
export function usePlaylist(playlistId: string | null) {
  return useQuery({
    queryKey: playlistKey(playlistId),
    queryFn: () => {
      if (playlistId === null) {
        throw new Error('A playlist read needs an id.');
      }

      return apiClient.send(endpoints.playlist, { playlistId });
    },
    enabled: playlistId !== null
  });
}
