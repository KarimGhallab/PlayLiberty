import { useQuery } from '@tanstack/react-query';

import { endpoints } from '@playliberty/contracts';
import { playlistTracksKey } from '@playliberty/query';

import { apiClient } from './client';

/* The detail's first page; the page walk is the list's own ticket. */
const PAGE_SIZE = 100;

/** The playlist's tracks, first page; `null` disables the read. */
export function usePlaylistTracks(playlistId: string | null) {
  return useQuery({
    queryKey: playlistTracksKey(playlistId ?? ''),
    queryFn: () => {
      if (playlistId === null) {
        throw new Error('A playlist tracks read needs an id.');
      }

      return apiClient.send(
        endpoints.playlistTracks,
        { playlistId },
        {},
        { limit: PAGE_SIZE, offset: 0 }
      );
    },
    enabled: playlistId !== null
  });
}
