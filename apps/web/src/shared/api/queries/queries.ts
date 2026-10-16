import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type {
  AccountSummary,
  AddTrackResult,
  Playlist,
  PlaylistTrack,
  PlaylistTracksPage,
  PlaylistWithCounts,
  Share,
  ShareLevel,
  SyncRun,
  Track,
  TrackFileStatusCounts
} from '@playliberty/contracts';
import {
  AccountSummarySchema,
  AddTrackResultSchema,
  PlaylistSchema,
  PlaylistSort,
  PlaylistTrackListSchema,
  PlaylistTracksPageSchema,
  PlaylistWithCountsSchema,
  ShareListSchema,
  ShareSchema,
  SyncRunSchema,
  TrackFileStatus,
  TrackSchema,
  createPageSchema
} from '@playliberty/contracts';

import { cacheEffects } from '../cacheEffects/cacheEffects';
import {
  ApiError,
  apiCommand,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost
} from '../client/client';

const PlaylistPageSchema = createPageSchema(PlaylistWithCountsSchema);
const AccountSummaryPageSchema = createPageSchema(AccountSummarySchema);

/* The library's list carries each playlist its own file-status counts, and the
 * mark on a tile is read from them rather than from a read per playlist. */
export interface PlaylistPage {
  items: PlaylistWithCounts[];
  total: number;
  limit: number;
  offset: number;
}

export function usePlaylists(): UseQueryResult<PlaylistPage, Error> {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: () => apiGet('/playlists', PlaylistPageSchema)
  });
}

/*
 * The account directory, the only source of another account's display name: a
 * shared item carries an `ownerAccountId` and nothing readable, so the name is
 * resolved here and nowhere else. One read at the default page size, because the
 * directory is a household and an owner past the first page is a miss the item
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
 * `GET /me` is the only read that names the reader, and the share picker needs it
 * to leave the reader's own row out: sharing with oneself is a refusal the route
 * owns.
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
 * The route answers `202` with the sync run it started, so the response is a
 * `SyncRun` and not the playlist: the playlist arrives on the next list read,
 * already marked `syncing`. Nothing here writes an optimistic row, because the
 * row the server is about to make is the row the person should see, and a client
 * guess at its id would be a second row.
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
      cacheEffects.libraryChanged(queryClient);
    }
  });
}

/*
 * Adding one video to several playlists, in one request: the route answers one
 * outcome per playlist rather than an overall status, since a batch can be part
 * added, part already there and part refused, and the dialog reports each one.
 * Nothing is written optimistically, and the response is returned rather than
 * dropped because the dialog's refusal state is built from it.
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
      cacheEffects.everyPlaylistChanged(queryClient);
    }
  });
}

/*
 * The id is in the key for the same reason the detail's other reads carry it:
 * invalidating one playlist's tracks must not touch another's. The filter is
 * there too, so each state's rows are cached under their own read and the list
 * re-reads when the filter moves; a playlist-scoped invalidation still catches
 * every state's read by prefix.
 */
export function playlistTracksKey(playlistId: string, state?: TrackFileStatus) {
  return ['playlist', playlistId, 'tracks', state ?? 'all'] as const;
}

/*
 * The key the playlist's whole association list is cached under, which is what a
 * queue is built from. Separate from the tracks key because the two reads answer
 * differently: the tracks key holds pages and this holds every association in one
 * response.
 */
export function playlistQueueKey(playlistId: string) {
  return ['playlist', playlistId, 'queue'] as const;
}

const PLAYLIST_TRACKS_PAGE_SIZE = 100;

async function fetchPlaylistTrackPage(
  playlistId: string,
  offset: number,
  state?: TrackFileStatus
): Promise<PlaylistTracksPage> {
  const query = new URLSearchParams({
    limit: String(PLAYLIST_TRACKS_PAGE_SIZE),
    offset: String(offset)
  });

  if (state !== undefined) {
    query.set('state', state);
  }

  return apiGet(
    `/playlists/${playlistId}/tracks?${query.toString()}`,
    PlaylistTracksPageSchema
  );
}

function nextTracksPageParam(lastPage: PlaylistTracksPage): number | undefined {
  const loaded = lastPage.offset + lastPage.items.length;

  return loaded < lastPage.total ? loaded : undefined;
}

export interface PlaylistTracksRead {
  readonly tracks: readonly PlaylistTrack[];
  readonly counts: TrackFileStatusCounts | undefined;
  readonly total: number | undefined;
  readonly isPlaceholderData: boolean;
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly isSuccess: boolean;
  readonly error: Error | null;
  readonly retrying: boolean;
  readonly retry: () => void;
  readonly hasMore: boolean;
  readonly loadingMore: boolean;
  readonly moreFailed: boolean;
  readonly loadMore: () => void;
}

export function usePlaylistTracks(
  playlistId: string,
  state?: TrackFileStatus
): PlaylistTracksRead {
  const query = useInfiniteQuery({
    queryKey: playlistTracksKey(playlistId, state),
    queryFn: ({ pageParam }) =>
      fetchPlaylistTrackPage(playlistId, pageParam, state),
    initialPageParam: 0,
    getNextPageParam: nextTracksPageParam,
    placeholderData: keepPreviousData
  });
  /* Stable, because a sentinel observes it: a fresh callback on every render
   * would tear the observer down and build it again on every render of the list. */
  const loadMore = useCallback(
    () => void query.fetchNextPage(),
    [query.fetchNextPage]
  );

  const pages = query.data?.pages;
  /* Stable while the data is, so a caller that keys an effect or a memo on the
   * list does not see a new array on every render. */
  const tracks = useMemo(
    () => pages?.flatMap(page => page.items) ?? [],
    [pages]
  );
  const firstPage = pages?.[0];

  return {
    tracks,
    counts: firstPage?.counts,
    total: firstPage?.total,
    isPlaceholderData: query.isPlaceholderData,
    isPending: query.isPending,
    isError: query.isError,
    isSuccess: query.isSuccess,
    error: query.error,
    retrying: query.isFetching && !query.isFetchingNextPage,
    retry: () => void query.refetch(),
    hasMore: query.hasNextPage,
    loadingMore: query.isFetchingNextPage,
    moreFailed: query.isFetchNextPageError,
    loadMore
  };
}

/*
 * The playlist's whole association list, which is the queue's own read. It is one
 * response and not a page walk, because a queue has to hold every playable track.
 * The read is lazy: the detail enables it only while this playlist is the queue,
 * and a play or shuffle press reads it through the query cache before it starts,
 * so a press never waits on a read that is only for the list.
 */
export async function fetchPlaylistQueue(
  playlistId: string
): Promise<PlaylistTrack[]> {
  const list = await apiGet(
    `/playlists/${playlistId}/queue`,
    PlaylistTrackListSchema
  );

  return list.items;
}

export function usePlaylistQueue(
  playlistId: string,
  enabled: boolean
): UseQueryResult<PlaylistTrack[], Error> {
  return useQuery({
    queryKey: playlistQueueKey(playlistId),
    queryFn: () => fetchPlaylistQueue(playlistId),
    enabled
  });
}

/*
 * Where the playlist's name comes from. The queue carries that name so the player
 * can label its source, and the read is separate from the tracks read because the
 * name belongs to the playlist and not to any track in it.
 *
 * `null` is no playlist open, which is the tab title's case at home: the read is
 * disabled rather than asked for a name there is none of.
 */
export function usePlaylist(
  playlistId: string | null
): UseQueryResult<Playlist, Error> {
  return useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: () => apiGet(`/playlists/${playlistId}`, PlaylistSchema),
    enabled: playlistId !== null
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
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}

/** Owner-only at the route; the menu gates it here. */
export function useRenamePlaylist(
  playlistId: string
): UseMutationResult<Playlist, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      apiPatch(`/playlists/${playlistId}`, { name }, PlaylistSchema),
    onSuccess: () => {
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}

/*
 * Changing the playlist's skip-non-music setting. The route answers with the
 * updated playlist, and the write is optimistic: the cache takes the new value on
 * the press so the switch moves at once, and a failure puts it back. The change is
 * not retroactive, so no track read moves; only the playlist and the library list
 * are touched.
 */
export function useUpdateSkipNonMusic(
  playlistId: string
): UseMutationResult<Playlist, Error, boolean> {
  const queryClient = useQueryClient();
  const key = ['playlist', playlistId];

  return useMutation({
    mutationFn: (skipNonMusic: boolean) =>
      apiPatch(
        `/playlists/${playlistId}/skip-non-music`,
        { skipNonMusic },
        PlaylistSchema
      ),
    onMutate: async (skipNonMusic: boolean) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Playlist>(key);

      if (previous !== undefined) {
        queryClient.setQueryData<Playlist>(key, { ...previous, skipNonMusic });
      }

      return { previous };
    },
    onError: (_error, _skipNonMusic, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: playlist => {
      queryClient.setQueryData(key, playlist);
      cacheEffects.libraryChanged(queryClient);
    }
  });
}

/*
 * Saving the order a playlist's tracks are read in. Unlike the skip setting, this
 * one moves the track reads: the saved order is the order the list and the queue
 * are read in, so the playlist-scoped invalidation is the one that asks both
 * again. The optimistic write moves the playlist's own value, and the order the
 * list draws follows when the reads answer.
 */
export function useUpdateSort(
  playlistId: string
): UseMutationResult<Playlist, Error, PlaylistSort> {
  const queryClient = useQueryClient();
  const key = ['playlist', playlistId];

  return useMutation({
    mutationFn: (sort: PlaylistSort) =>
      apiPatch(`/playlists/${playlistId}/sort`, { sort }, PlaylistSchema),
    onMutate: async (sort: PlaylistSort) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Playlist>(key);

      if (previous !== undefined) {
        queryClient.setQueryData<Playlist>(key, { ...previous, sort });
      }

      return { previous };
    },
    onError: (_error, _sort, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: playlist => {
      queryClient.setQueryData(key, playlist);
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}

/*
 * Pinning a playlist into the account's own gallery, or taking it out again. The
 * route answers the updated playlist, but the read that moved is the library's:
 * the flag is on every item and the read's order is the section's, so the write
 * flips the flag on the cached page and the page moves the item between its two
 * groups. The flag is the only thing the client touches, because grouping on it
 * is the client's whole part and the server owns the order; the gallery is then
 * invalidated so the read settles that order. A failure puts the snapshot back,
 * and the notice is the caller's. No event arrives for a pin, so this read is the
 * only thing that carries the new placement.
 */
export function useUpdatePin(
  playlistId: string
): UseMutationResult<Playlist, Error, boolean> {
  const queryClient = useQueryClient();
  const key = ['playlists'];

  return useMutation({
    mutationFn: (pinned: boolean) =>
      apiPatch(`/playlists/${playlistId}/pin`, { pinned }, PlaylistSchema),
    onMutate: async (pinned: boolean) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PlaylistPage>(key);

      if (previous !== undefined) {
        queryClient.setQueryData<PlaylistPage>(key, {
          ...previous,
          items: previous.items.map(item =>
            item.id === playlistId ? { ...item, pinned } : item
          )
        });
      }

      return { previous };
    },
    onError: (_error, _pinned, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: () => {
      cacheEffects.libraryChanged(queryClient);
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
      cacheEffects.playlistRemoved(queryClient, playlistId);
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
      cacheEffects.trackChanged(queryClient, [playlistId]);
    }
  });
}

/*
 * Re-fetching one failed fileless track whole, without trimming. The route flips
 * the track's recorded policy to full length and returns it to `pending`, and the
 * playlist's tracks are read again so the row leaves the failed state. The
 * playlist is invalidated too, because its failed count has moved.
 */
export function useFetchTrackWhole(
  playlistId: string
): UseMutationResult<Track, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackId: string) =>
      apiCommand(`/tracks/${trackId}/fetch-whole`, TrackSchema),
    onSuccess: () => {
      cacheEffects.trackChanged(queryClient, [playlistId]);
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
      cacheEffects.trackChanged(queryClient, [playlistId]);
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
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}

/** The route answers `204`, so there is nothing to return. */
export function useRevokeShare(
  playlistId: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) =>
      apiDelete(`/playlists/${playlistId}/shares/${accountId}`),
    onSuccess: () => {
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}
