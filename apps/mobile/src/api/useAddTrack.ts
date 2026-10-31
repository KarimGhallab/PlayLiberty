import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AddTrackInput } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { cacheEffects } from '@playliberty/query';

import { apiClient } from './client';

/* One request for the whole batch, one outcome per chosen playlist. Every
 * playlist read follows, because the picked playlists span the library. */
export function useAddTrack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddTrackInput) =>
      apiClient.send(
        endpoints.addTrack,
        {},
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        }
      ),
    onSuccess: () => {
      cacheEffects.everyPlaylistChanged(queryClient);
    }
  });
}
