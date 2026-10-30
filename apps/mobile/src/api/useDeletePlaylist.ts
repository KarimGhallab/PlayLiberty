import { useMutation, useQueryClient } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { cacheEffects } from '@playliberty/query';

import { apiClient } from './client';

/** Delete one playlist once its undo window has passed. */
export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlistId: string) =>
      apiClient.command(endpoints.deletePlaylist, { playlistId }),
    onSuccess: (_void, playlistId) => {
      cacheEffects.playlistRemoved(queryClient, playlistId);
    }
  });
}
