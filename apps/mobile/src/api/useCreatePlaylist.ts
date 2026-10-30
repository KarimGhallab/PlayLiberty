import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreatePlaylistInput } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { cacheEffects } from '@playliberty/query';

import { apiClient } from './client';

/* A `202` with the started run; the playlist arrives on the next read,
 * syncing. No optimistic row; the refusal is the sheet's to show. */
export function useCreatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePlaylistInput) =>
      apiClient.send(
        endpoints.createPlaylist,
        {},
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        }
      ),
    onSuccess: () => {
      cacheEffects.libraryChanged(queryClient);
    }
  });
}
