import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Playlist, PlaylistSort } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { cacheEffects, playlistKey } from '@playliberty/query';

import { apiClient } from './client';

/* Saving the read order moves the list and the queue, so the playlist reads are
 * asked again. The press moves the saved value first, and a refusal puts it
 * back. */
export function useUpdateSort(playlistId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sort: PlaylistSort) =>
      apiClient.send(
        endpoints.sortPlaylist,
        { playlistId },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort })
        }
      ),
    onMutate: async sort => {
      await queryClient.cancelQueries({ queryKey: playlistKey(playlistId) });
      const previous = queryClient.getQueryData<Playlist>(
        playlistKey(playlistId)
      );

      if (previous !== undefined) {
        queryClient.setQueryData<Playlist>(playlistKey(playlistId), {
          ...previous,
          sort
        });
      }

      return { previous };
    },
    onError: (_error, _sort, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(playlistKey(playlistId), context.previous);
      }
    },
    onSuccess: playlist => {
      queryClient.setQueryData(playlistKey(playlistId), playlist);
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}
