import { useMutation, useQueryClient } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { cacheEffects, playlistKey } from '@playliberty/query';
import type { CoverCrop } from '@playliberty/ui-foundation';

import { apiClient } from './client';

export interface SetPlaylistCoverVariables {
  readonly playlistId: string;
  readonly file: Blob;
  readonly contentType: string;
  readonly crop: CoverCrop | null;
}

/* The four fields travel together or not at all; six decimals keep the region
 * inside a pixel of what the stage showed. */
function cropQuery(crop: CoverCrop | null): Record<string, string> {
  if (crop === null) {
    return {};
  }

  return {
    cropX: crop.x.toFixed(6),
    cropY: crop.y.toFixed(6),
    cropWidth: crop.width.toFixed(6),
    cropHeight: crop.height.toFixed(6)
  };
}

/* The image bytes stay whole; the server normalises them and answers the
 * playlist carrying its new cover version. */
export function useSetPlaylistCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      playlistId,
      file,
      contentType,
      crop
    }: SetPlaylistCoverVariables) =>
      apiClient.send(
        endpoints.setPlaylistCover,
        { playlistId },
        {
          headers: { 'Content-Type': contentType },
          body: file
        },
        cropQuery(crop)
      ),
    onSuccess: (playlist, { playlistId }) => {
      queryClient.setQueryData(playlistKey(playlistId), playlist);
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}
