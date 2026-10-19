import type {
  QueryClient,
  UseMutationResult,
  UseQueryResult
} from '@tanstack/react-query';
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

/* The only source of another account's display name: a shared item carries an
 * `ownerAccountId` only, and an owner past the first page is a miss. */
export function useAccountDirectory(): UseQueryResult<AccountSummary[], Error> {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiGet('/accounts', AccountSummaryPageSchema),
    select: page => page.items
  });
}

/* The only read that names the reader; the share picker omits its row, and
 * sharing with oneself is a route refusal. */
export function useCurrentAccount(): UseQueryResult<AccountSummary, Error> {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiGet('/me', AccountSummarySchema)
  });
}

/*
 * The name an owner id resolves to, or null when absent. Null is a real answer
 * and must not be confused with an empty string, which renders a blank line.
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
 * A `202` with the started `SyncRun`; the playlist arrives on the next read,
 * `syncing`. No optimistic row; a refusal is the caller's to show.
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
 * One request, one outcome per playlist: a batch can be part added, part
 * present or refused, so both reads are invalidated after.
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
 * The id scopes invalidation to one playlist; the filter caches each state
 * under its own read, which a playlist-prefix invalidation still catches.
 */
export function playlistTracksKey(playlistId: string, state?: TrackFileStatus) {
  return ['playlist', playlistId, 'tracks', state ?? 'all'] as const;
}

/*
 * The playlist's whole association list, what a queue is built from. Separate
 * from the tracks key: this is every association in one response.
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
  /*
   * Stable, because a sentinel observes it: a fresh callback would tear the
   * observer down and rebuild it every render of the list.
   */
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
 * The queue's own read: one response, not a page walk, because a queue holds
 * every playable track. Lazy, so a press reads the cache and never waits.
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

export function readPlaylistQueue(
  queryClient: QueryClient,
  playlistId: string
): Promise<PlaylistTrack[]> {
  return queryClient.query({
    queryKey: playlistQueueKey(playlistId),
    queryFn: () => fetchPlaylistQueue(playlistId)
  });
}

/*
 * The playlist's name, separate from the tracks read because the name belongs
 * to the playlist. `null` disables it, the tab title's case at home.
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
 * The latest sync run, the only place a playlist's counts live. A `404` means
 * never synced and maps to `null`; any other status is an error.
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
 * Start a sync: the `202` run is `running` and completes later, so the playlist
 * is read again to draw the settled state on the next refetch.
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
 * The skip-non-music switch, written optimistically so it moves on the press.
 * Not retroactive: no track read moves, only the playlist and library.
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
 * Saving the read order moves the track reads too: the list and queue are read
 * in it, so a playlist-scoped invalidation asks both again.
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
 * Pin flips the flag on the cached library page, which regroups: grouping is
 * the client's part, the server owns order, and no event carries it.
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

/* Delete one playlist: `204`, nothing returned. The library is invalidated; the
 * caller owns leaving the route, which a component does not decide. */
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
 * Retry a failed download: the track answers `downloading` and the tracks are
 * read again so the row catches up; the failed count moved too.
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
 * Re-fetch a fileless track whole: the route flips its recorded policy to full
 * length, returning it to `pending`, so the tracks and failed count are reread.
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
 * Remove one track: `204`. The server suppresses it so the next sync does not
 * re-add it; the count moved, so both reads are invalidated.
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
 * One playlist's shares, gated on `open` so the dialog asks only on screen. A
 * `404` stays an error: a playlist the account can share must be found.
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
 * Grant a share: the shares read is invalidated so the list settles on the
 * server's answer, including a level change on an existing share.
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
