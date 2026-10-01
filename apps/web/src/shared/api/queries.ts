import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { PlaylistSchema, createPageSchema } from '@playliberty/contracts';
import type { Playlist } from '@playliberty/contracts';

import { apiGet } from './client';

const PlaylistPageSchema = createPageSchema(PlaylistSchema);

export interface PlaylistPage {
  items: Playlist[];
  total: number;
  limit: number;
  offset: number;
}

/** The library's data. One placeholder query for the scaffold. */
export function usePlaylists(): UseQueryResult<PlaylistPage, Error> {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: () => apiGet('/playlists', PlaylistPageSchema)
  });
}
