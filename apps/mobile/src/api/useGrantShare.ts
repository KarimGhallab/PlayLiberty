import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Share, ShareLevel } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { cacheEffects } from '@playliberty/query';

import { apiClient } from './client';

export interface GrantShareVariables {
  readonly accountId: string;
  readonly level: ShareLevel;
}

/** The route upserts, so a new share and a level change are one write. */
export function useGrantShare(playlistId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<Share, Error, GrantShareVariables>({
    mutationFn: async ({ accountId, level }) => {
      if (playlistId === null) {
        throw new Error('A grant needs a playlist.');
      }

      return apiClient.send(
        endpoints.grantShare,
        { playlistId },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId, level })
        }
      );
    },
    onSuccess: () => {
      if (playlistId === null) {
        return;
      }

      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}
