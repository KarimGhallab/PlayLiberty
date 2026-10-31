import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Playlist } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { cacheEffects, playlistKey } from '@playliberty/query';

import { apiClient } from './client';

/* The switch moves on the press: the playlist cache carries the new value
 * until the write answers, and a refusal puts the saved one back. The setting
 * is not retroactive, so no track read is asked again. */
export function useUpdateSkipNonMusic(playlistId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skipNonMusic: boolean) =>
      apiClient.send(
        endpoints.skipNonMusic,
        { playlistId },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skipNonMusic })
        }
      ),
    onMutate: async skipNonMusic => {
      await queryClient.cancelQueries({ queryKey: playlistKey(playlistId) });
      const previous = queryClient.getQueryData<Playlist>(
        playlistKey(playlistId)
      );

      if (previous !== undefined) {
        queryClient.setQueryData<Playlist>(playlistKey(playlistId), {
          ...previous,
          skipNonMusic
        });
      }

      return { previous };
    },
    onError: (_error, _skipNonMusic, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(playlistKey(playlistId), context.previous);
      }
    },
    onSuccess: playlist => {
      queryClient.setQueryData(playlistKey(playlistId), playlist);
      cacheEffects.libraryChanged(queryClient);
    }
  });
}
