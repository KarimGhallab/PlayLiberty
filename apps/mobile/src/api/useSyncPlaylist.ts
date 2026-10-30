import { useMutation, useQueryClient } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { cacheEffects } from '@playliberty/query';

import { apiClient } from './client';

/** Start one playlist's sync; the read catches the run it answers with. */
export function useSyncPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlistId: string) =>
      apiClient.command(endpoints.syncPlaylist, { playlistId }),
    onSuccess: (_void, playlistId) => {
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}
