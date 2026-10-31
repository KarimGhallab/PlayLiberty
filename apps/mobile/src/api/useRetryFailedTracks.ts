import { useMutation, useQueryClient } from '@tanstack/react-query';

import { TrackFileStatus } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { cacheEffects } from '@playliberty/query';

import { apiClient } from './client';
import { PLAYLIST_TRACKS_PAGE_SIZE } from './usePlaylistTracks';

/* The failed set is read page by page, then each track is retried; the
 * playlist reads follow whichever retries landed. */
export function useRetryFailedTracks(playlistId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const trackIds: string[] = [];
      let offset = 0;

      for (;;) {
        const page = await apiClient.send(
          endpoints.playlistTracks,
          { playlistId },
          {},
          {
            limit: PLAYLIST_TRACKS_PAGE_SIZE,
            offset,
            state: TrackFileStatus.Failed
          }
        );

        trackIds.push(...page.items.map(entry => entry.track.id));
        offset += page.items.length;

        if (page.items.length === 0 || offset >= page.total) {
          break;
        }
      }

      for (const trackId of trackIds) {
        await apiClient.send(endpoints.retryTrack, { trackId });
      }

      return trackIds.length;
    },
    onSettled: () => {
      cacheEffects.trackChanged(queryClient, [playlistId]);
    }
  });
}
