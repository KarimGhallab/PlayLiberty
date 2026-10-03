import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import {
  PlaylistSchema,
  SyncRunSchema,
  createPageSchema
} from '@playliberty/contracts';
import type { Playlist, SyncRun } from '@playliberty/contracts';

import { apiGet, apiPost } from './client';

const PlaylistPageSchema = createPageSchema(PlaylistSchema);

export interface PlaylistPage {
  items: Playlist[];
  total: number;
  limit: number;
  offset: number;
}

/** The library's data. */
export function usePlaylists(): UseQueryResult<PlaylistPage, Error> {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: () => apiGet('/playlists', PlaylistPageSchema)
  });
}

/*
 * Creating a Synced playlist. The route answers `202` with the sync run it
 * started, so the response is a `SyncRun` and not the playlist: the playlist
 * arrives on the next list read, already marked `syncing`. Nothing here writes an
 * optimistic row, because the row the server is about to make is the row the
 * person should see, and a client guess at its id would be a second row.
 *
 * The list is invalidated on success, so the read that follows carries the new
 * playlist in whatever state the sync has reached. A refusal is left to the
 * caller: it has the problem document and shows the server's `detail` beside the
 * field.
 */
export function useCreatePlaylist(): UseMutationResult<SyncRun, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (url: string) => apiPost('/playlists', { url }, SyncRunSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
    }
  });
}
