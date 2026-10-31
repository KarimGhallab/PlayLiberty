import { useMutation, useQueryClient } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { cacheEffects, playlistKey } from '@playliberty/query';

import { apiClient } from './client';

export interface SetPlaylistCoverVariables {
  readonly playlistId: string;
  readonly file: Blob;
  readonly contentType: string;
}

/* The image bytes stay whole; the server normalises them and answers the
 * playlist carrying its new cover version. */
export function useSetPlaylistCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      playlistId,
      file,
      contentType
    }: SetPlaylistCoverVariables) =>
      apiClient.send(
        endpoints.setPlaylistCover,
        { playlistId },
        {
          headers: { 'Content-Type': contentType },
          body: file
        }
      ),
    onSuccess: (playlist, { playlistId }) => {
      queryClient.setQueryData(playlistKey(playlistId), playlist);
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}
