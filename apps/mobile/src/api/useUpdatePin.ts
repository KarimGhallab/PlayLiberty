import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PlaylistPage } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { cacheEffects, libraryKey } from '@playliberty/query';

import { apiClient } from './client';
import { pinPlaylistInPage } from './playlistCache';

export interface PinPlaylistVariables {
  readonly playlistId: string;
  readonly pinned: boolean;
}

/* The card moves on the press: the cached page carries the new flag until the
 * gallery reads again, and a refusal puts the previous page back. */
export function useUpdatePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, pinned }: PinPlaylistVariables) =>
      apiClient.send(
        endpoints.pinPlaylist,
        { playlistId },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pinned })
        }
      ),
    onMutate: async ({ playlistId, pinned }: PinPlaylistVariables) => {
      await queryClient.cancelQueries({ queryKey: libraryKey });
      const previous = queryClient.getQueryData<PlaylistPage>(libraryKey);

      if (previous !== undefined) {
        queryClient.setQueryData<PlaylistPage>(
          libraryKey,
          pinPlaylistInPage(previous, playlistId, pinned)
        );
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(libraryKey, context.previous);
      }
    },
    onSuccess: () => {
      cacheEffects.libraryChanged(queryClient);
    }
  });
}
