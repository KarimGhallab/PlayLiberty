import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import {
  AccountSummarySchema,
  PlaylistSchema,
  PlaylistTrackSchema,
  SyncRunSchema,
  createPageSchema
} from '@playliberty/contracts';
import type {
  AccountSummary,
  Playlist,
  PlaylistTrack,
  SyncRun
} from '@playliberty/contracts';

import { apiGet, apiPost } from './client';

const PlaylistPageSchema = createPageSchema(PlaylistSchema);
const AccountSummaryPageSchema = createPageSchema(AccountSummarySchema);
const PlaylistTrackPageSchema = createPageSchema(PlaylistTrackSchema);

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
 * The account directory, which is the only source of another account's display
 * name. A shared item carries an `ownerAccountId` and nothing readable, so the
 * name is resolved here and nowhere else. One read at the default page size: the
 * directory is a household, and an owner past the first page is a miss the item
 * treats as a miss rather than a placeholder.
 */
export function useAccountDirectory(): UseQueryResult<AccountSummary[], Error> {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiGet('/accounts', AccountSummaryPageSchema),
    select: page => page.items
  });
}

/*
 * The name an owner id resolves to, or null when the directory does not contain
 * it. A pure function so the fallback is testable without a component: a null is
 * a real answer (the item shows its indicator alone), and it must not be confused
 * with an empty string, which would render a line with nothing on it.
 */
export function ownerNameFrom(
  directory: AccountSummary[],
  ownerAccountId: string
): string | null {
  return (
    directory.find(account => account.id === ownerAccountId)?.displayName ??
    null
  );
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

/*
 * The tracks of one playlist, which is the only list a queue is built from. The
 * read is per playlist and its key carries the id for the same reason the detail's
 * other reads do: invalidating one playlist's tracks must not touch another's.
 */
export function usePlaylistTracks(
  playlistId: string
): UseQueryResult<PlaylistTrack[], Error> {
  return useQuery({
    queryKey: ['playlist', playlistId, 'tracks'],
    queryFn: () =>
      apiGet(`/playlists/${playlistId}/tracks`, PlaylistTrackPageSchema),
    select: page => page.items
  });
}

/*
 * One playlist, which is where its name comes from. The queue carries that name so
 * the player can label its source, and the read is separate from the tracks read
 * because the name belongs to the playlist and not to any track in it.
 */
export function usePlaylist(
  playlistId: string
): UseQueryResult<Playlist, Error> {
  return useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: () => apiGet(`/playlists/${playlistId}`, PlaylistSchema)
  });
}
