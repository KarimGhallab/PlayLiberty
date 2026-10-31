import { useMutation, useQueryClient } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { cacheEffects } from '@playliberty/query';

import { apiClient } from './client';

export interface RenamePlaylistVariables {
  readonly playlistId: string;
  readonly name: string;
}

/** Owner-only at the route; the actions sheet gates it here. */
export function useRenamePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, name }: RenamePlaylistVariables) =>
      apiClient.send(
        endpoints.renamePlaylist,
        { playlistId },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        }
      ),
    onSuccess: (_playlist, { playlistId }) => {
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}
