import { useMutation, useQueryClient } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { cacheEffects } from '@playliberty/query';

import { apiClient } from './client';

/** Remove one track from the playlist; the playlist reads follow. */
export function useRemoveTrack(playlistId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackId: string) =>
      apiClient.command(endpoints.removeTrack, { playlistId, trackId }),
    onSuccess: () => {
      cacheEffects.trackChanged(queryClient, [playlistId]);
    }
  });
}
