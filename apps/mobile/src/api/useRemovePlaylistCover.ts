import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Playlist } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { cacheEffects, playlistKey } from '@playliberty/query';

import { apiClient } from './client';

/** The custom cover goes; the playlist falls back to its first track. */
export function useRemovePlaylistCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlistId: string) =>
      apiClient.command(endpoints.removePlaylistCover, { playlistId }),
    onSuccess: (_void, playlistId) => {
      queryClient.setQueryData<Playlist>(playlistKey(playlistId), previous =>
        previous === undefined
          ? undefined
          : { ...previous, coverUpdatedAt: null }
      );
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}
