import { useQuery } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { playlistSharesKey } from '@playliberty/query';

import { apiClient } from './client';

/** One playlist's shares, read only while the sheet is open. */
export function usePlaylistShares(playlistId: string | null) {
  return useQuery({
    queryKey: playlistSharesKey(playlistId ?? ''),
    queryFn: async () => {
      if (playlistId === null) {
        throw new Error('A shares read needs an id.');
      }

      return apiClient.send(endpoints.playlistShares, { playlistId });
    },
    enabled: playlistId !== null
  });
}
