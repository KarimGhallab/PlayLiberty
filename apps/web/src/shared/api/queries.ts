import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import {
  AccountSummarySchema,
  AddTrackResultSchema,
  PlaylistSchema,
  PlaylistTrackSchema,
  ShareListSchema,
  ShareSchema,
  SyncRunSchema,
  TrackSchema,
  createPageSchema
} from '@playliberty/contracts';
import type {
  AccountSummary,
  AddTrackResult,
  Playlist,
  PlaylistTrack,
  Share,
  ShareLevel,
  SyncRun,
  Track
} from '@playliberty/contracts';

import {
  ApiError,
  apiCommand,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost
} from './client';

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
 * The account behind the current identity. `GET /me` is the only read that names
 * the reader, and the share picker needs it to leave the reader's own row out:
 * sharing with oneself is a refusal the route owns.
 */
export function useCurrentAccount(): UseQueryResult<AccountSummary, Error> {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiGet('/me', AccountSummarySchema)
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
export function useCreatePlaylist(): UseMutationResult<
  SyncRun,
  Error,
  { url: string; skipNonMusic: boolean }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { url: string; skipNonMusic: boolean }) =>
      apiPost('/playlists', input, SyncRunSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
    }
  });
}

/*
 * Adding one video to several playlists, in one request. The route is
 * `POST /tracks`, its body a video URL and the chosen playlist ids, and it
 * answers one outcome per playlist rather than an overall status: a batch can be
 * part added, part already there and part refused, and the dialog reports each
 * one. Nothing is written optimistically, and the response is returned rather
 * than dropped because the dialog's refusal state is built from it.
 *
 * Both reads are invalidated on success: the chosen playlists gain an
 * association, so each one's tracks and the library's counts have both moved.
 */
export function useAddTrack(): UseMutationResult<
  AddTrackResult,
  Error,
  { url: string; playlistIds: string[] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { url: string; playlistIds: string[] }) =>
      apiPost('/tracks', input, AddTrackResultSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
      void queryClient.invalidateQueries({ queryKey: ['playlist'] });
    }
  });
}

/*
 * The key the tracks of one playlist are cached under. It carries the id for the
 * same reason the detail's other reads do: invalidating one playlist's tracks
 * must not touch another's. It is exported because the shuffle control builds a
 * queue from a playlist the listener is not standing on, and reading it under the
 * same key leaves the detail's own read already warm.
 */
export function playlistTracksKey(playlistId: string) {
  return ['playlist', playlistId, 'tracks'] as const;
}

/*
 * The tracks of one playlist, which is the only list a queue is built from. A
 * plain fetch beside the hook, so a caller that is not a component can build a
 * queue from it without restating the route.
 */
export async function fetchPlaylistTracks(
  playlistId: string
): Promise<PlaylistTrack[]> {
  const page = await apiGet(
    `/playlists/${playlistId}/tracks`,
    PlaylistTrackPageSchema
  );
  return page.items;
}

export function usePlaylistTracks(
  playlistId: string
): UseQueryResult<PlaylistTrack[], Error> {
  return useQuery({
    queryKey: playlistTracksKey(playlistId),
    queryFn: () => fetchPlaylistTracks(playlistId)
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

/*
 * The latest sync run of one playlist, which is the only place its counts live.
 *
 * A playlist that has never synced has no run, and the route answers `404` for
 * that. A `404` here is therefore a real answer and not a failure, so it is
 * mapped to `null` rather than thrown: the summary renders nothing for a never
 * synced playlist, and the page's own never-synced state is driven by the
 * header's `lastSyncedAt`, not by this read.
 *
 * Any other status stays an error, because an unreachable route is not the same
 * fact as an absent run and must not be drawn as one.
 */
export function useLatestSyncRun(
  playlistId: string
): UseQueryResult<SyncRun | null, Error> {
  return useQuery({
    queryKey: ['playlist', playlistId, 'sync-runs', 'latest'],
    queryFn: async () => {
      try {
        return await apiGet(
          `/playlists/${playlistId}/sync-runs/latest`,
          SyncRunSchema
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }

        throw error;
      }
    }
  });
}

/*
 * Starting a sync for one playlist. The route answers `202` with the run it
 * started, and the playlist itself is read again so its state and its counts
 * catch up: the run is `running` on the reply and completes later, so the read
 * after it is what draws the settled state on the next refetch.
 */
export function useSyncPlaylist(
  playlistId: string
): UseMutationResult<SyncRun, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiCommand(`/playlists/${playlistId}/sync`, SyncRunSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['playlist', playlistId]
      });
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
    }
  });
}

/** Renaming one playlist. Owner-only at the route; the menu gates it here. */
export function useRenamePlaylist(
  playlistId: string
): UseMutationResult<Playlist, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      apiPatch(`/playlists/${playlistId}`, { name }, PlaylistSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['playlist', playlistId]
      });
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
    }
  });
}

/*
 * Deleting one playlist. The route answers `204`, so there is nothing to return;
 * the library is invalidated and the page navigates home on success, which the
 * caller owns because a component does not decide where a deletion lands.
 */
export function useDeletePlaylist(
  playlistId: string
): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiDelete(`/playlists/${playlistId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
    }
  });
}

/*
 * Retrying one failed track's download. The route answers with the track, now
 * `downloading`, and the playlist's tracks are read again so the row catches up:
 * the failure reason clears and the state word becomes Downloading. The playlist
 * itself is invalidated too, because its failed count has moved.
 */
export function useRetryTrack(
  playlistId: string
): UseMutationResult<Track, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackId: string) =>
      apiCommand(`/tracks/${trackId}/retry`, TrackSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['playlist', playlistId]
      });
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
    }
  });
}

/*
 * Removing one track from a playlist. The route answers `204`; the server writes
 * a suppression so the next sync does not put the video back, and the playlist's
 * track count moves, so both the tracks read and the playlist read are
 * invalidated.
 */
export function useRemoveTrack(
  playlistId: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackId: string) =>
      apiDelete(`/playlists/${playlistId}/tracks/${trackId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['playlist', playlistId]
      });
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
    }
  });
}

/*
 * The shares of one playlist, for the share dialog. The read is gated on `open`
 * so the dialog only asks the route when it is on screen, and a `404` is left as
 * an error rather than mapped to empty, because a playlist the account can share
 * must be found.
 */
export function usePlaylistShares(
  playlistId: string,
  enabled: boolean
): UseQueryResult<Share[], Error> {
  return useQuery({
    queryKey: ['playlist', playlistId, 'shares'],
    queryFn: () => apiGet(`/playlists/${playlistId}/shares`, ShareListSchema),
    enabled
  });
}

/*
 * Granting a share. The route answers with the share, and the shares read is
 * invalidated so the list settles on the server's answer, including a level
 * change on a share that already existed.
 */
export function useGrantShare(
  playlistId: string
): UseMutationResult<Share, Error, { accountId: string; level: ShareLevel }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { accountId: string; level: ShareLevel }) =>
      apiPost(`/playlists/${playlistId}/shares`, input, ShareSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['playlist', playlistId, 'shares']
      });
      void queryClient.invalidateQueries({
        queryKey: ['playlist', playlistId]
      });
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
    }
  });
}

/** Revoking a share. The route answers `204`, so there is nothing to return. */
export function useRevokeShare(
  playlistId: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) =>
      apiDelete(`/playlists/${playlistId}/shares/${accountId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['playlist', playlistId, 'shares']
      });
      void queryClient.invalidateQueries({
        queryKey: ['playlist', playlistId]
      });
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
    }
  });
}
