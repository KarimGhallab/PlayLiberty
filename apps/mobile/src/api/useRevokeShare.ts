import { useMutation, useQueryClient } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { cacheEffects } from '@playliberty/query';

import { apiClient } from './client';

/** Revoke one account's share. The route answers `204`. */
export function useRevokeShare(playlistId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      if (playlistId === null) {
        throw new Error('A revoke needs a playlist.');
      }

      await apiClient.command(endpoints.revokeShare, { playlistId, accountId });
    },
    onSuccess: () => {
      if (playlistId === null) {
        return;
      }

      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}
