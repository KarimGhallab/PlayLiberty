import { useQuery } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { latestSyncRunKey } from '@playliberty/query';

import { ApiError } from './apiClient/ApiClient';
import { apiClient } from './client';

/* A never-synced playlist answers 404, which is a real state rather than a
 * failed read. Any other status stays an error. */
export function useLatestSyncRun(playlistId: string | null) {
  return useQuery({
    queryKey: latestSyncRunKey(playlistId ?? ''),
    queryFn: async () => {
      if (playlistId === null) {
        throw new Error('A sync run read needs an id.');
      }

      try {
        return await apiClient.send(endpoints.latestSyncRun, { playlistId });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
    enabled: playlistId !== null
  });
}
