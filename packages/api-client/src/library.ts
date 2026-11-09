import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query';
import { useCallback } from 'react';

import type {
  CreatePlaylistInput,
  Playlist,
  PlaylistPage,
  PlaylistWithCounts,
  SyncRun
} from '@playliberty/contracts';
import {
  PlaylistSort,
  PlaylistSyncStatus,
  ProblemCode,
  Provider,
  endpoints
} from '@playliberty/contracts';
import type { SyncAllOutcome } from '@playliberty/library';
import {
  cacheEffects,
  insertPlaylistInPages,
  libraryKey,
  optimisticPatch,
  pinPlaylistInPages,
  restoreOptimistic
} from '@playliberty/query';
import type { OptimisticContext } from '@playliberty/query';

import { ApiError } from './apiError.js';
import { apiClient } from './configure.js';

/* The gallery's page bound, written once for both clients. It matches the
 * server's default, so a page is the same size wherever it is asked for. */
export const LIBRARY_PAGE_SIZE = 50;

/* The next page starts where the loaded pages end, and stops when they reach
 * the server's total or a page comes back empty. */
export function nextLibraryPageOffset(page: PlaylistPage): number | undefined {
  const loaded = page.offset + page.items.length;

  return page.items.length > 0 && loaded < page.total ? loaded : undefined;
}

/* The gallery reads one page shape; the infinite query holds the pages. */
export function flattenPlaylistPages(
  data: InfiniteData<PlaylistPage>
): PlaylistPage {
  const first = data.pages[0];

  return {
    items: data.pages.flatMap(page => page.items),
    total: first?.total ?? 0,
    limit: first?.limit ?? LIBRARY_PAGE_SIZE,
    offset: 0
  };
}

export function libraryQueryOptions() {
  return {
    queryKey: libraryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      apiClient().send(
        endpoints.playlists,
        {},
        {},
        { limit: LIBRARY_PAGE_SIZE, offset: pageParam }
      ),
    getNextPageParam: nextLibraryPageOffset,
    select: flattenPlaylistPages
  };
}

export interface LibraryRead {
  readonly data: PlaylistPage | undefined;
  readonly dataUpdatedAt: number;
  readonly isPending: boolean;
  readonly isFetching: boolean;
  readonly isRefetching: boolean;
  readonly isFetchNextPageError: boolean;
  readonly isError: boolean;
  readonly isSuccess: boolean;
  readonly error: Error | null;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly fetchNextPage: () => void;
  readonly refetch: () => void;
}

/** The gallery's one read: the paged list, appended as the grid scrolls. */
export function usePlaylists(): LibraryRead {
  const query = useInfiniteQuery(libraryQueryOptions());
  const fetchNextPage = useCallback(() => {
    void query.fetchNextPage();
  }, [query.fetchNextPage]);
  const refetch = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  return {
    data: query.data,
    dataUpdatedAt: query.dataUpdatedAt,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    isFetchNextPageError: query.isFetchNextPageError,
    isError: query.isError,
    isSuccess: query.isSuccess,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage,
    refetch
  };
}

/* The created row stays at the head of the library this long, so the accepted
 * playlist reads as syncing before the next gallery read replaces it. */
export const SYNCING_HOLD_MS = 6000;

function sourceIdFromUrl(url: string): string {
  try {
    const parsed = new URL(url);

    return (
      parsed.searchParams.get('list') ?? parsed.searchParams.get('v') ?? url
    );
  } catch {
    return url;
  }
}

export function createPlaylistPlaceholder(
  run: SyncRun,
  input: CreatePlaylistInput
): PlaylistWithCounts {
  const sourceId = sourceIdFromUrl(input.url);
  const now = new Date().toISOString();

  return {
    id: run.playlistId,
    ownerAccountId: '',
    name: sourceId,
    coverTrackId: null,
    coverUpdatedAt: null,
    provider: Provider.Youtube,
    sourcePlaylistId: sourceId,
    syncStatus: PlaylistSyncStatus.Syncing,
    lastSyncedAt: null,
    trackCount: 0,
    skipNonMusic: input.skipNonMusic,
    sort: PlaylistSort.Playlist,
    access: 'owner',
    hasShares: false,
    pinned: false,
    counts: {
      stored: 0,
      pending: 0,
      downloading: 0,
      failed: 0,
      unavailable: 0
    },
    remoteRemoved: 0,
    createdAt: now,
    updatedAt: now
  };
}

export function createPlaylistOptions(queryClient: QueryClient) {
  return {
    mutationFn: (input: CreatePlaylistInput) =>
      apiClient().send(
        endpoints.createPlaylist,
        {},
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        }
      ),
    onSuccess: (run: SyncRun, input: CreatePlaylistInput) => {
      const previous =
        queryClient.getQueryData<InfiniteData<PlaylistPage>>(libraryKey);

      if (previous !== undefined) {
        queryClient.setQueryData<InfiniteData<PlaylistPage>>(
          libraryKey,
          insertPlaylistInPages(previous, createPlaylistPlaceholder(run, input))
        );
      }

      cacheEffects.libraryChanged(queryClient);
    }
  };
}

/* A `202` with the started `SyncRun` and no optimistic row; a refusal is the
 * caller's to show. The playlist arrives on the next read, `syncing`. */
export function useCreatePlaylist(): UseMutationResult<
  SyncRun,
  Error,
  CreatePlaylistInput
> {
  return useMutation(createPlaylistOptions(useQueryClient()));
}

export type StartSync = (playlistId: string) => Promise<void>;

/* Start the frozen set one at a time; a `409` is counted and the loop goes on,
 * any other refusal stops it. */
export async function runSyncAll(
  playlistIds: readonly string[],
  start: StartSync
): Promise<SyncAllOutcome> {
  let started = 0;
  let alreadyRunning = 0;

  for (const playlistId of playlistIds) {
    try {
      await start(playlistId);
      started += 1;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.problem?.code === ProblemCode.SyncAlreadyRunning
      ) {
        alreadyRunning += 1;
        continue;
      }

      return {
        started,
        alreadyRunning,
        stopped: error instanceof ApiError ? error.problem : null
      };
    }
  }

  return { started, alreadyRunning, stopped: null };
}

export function syncAllPlaylistsOptions(queryClient: QueryClient) {
  return {
    mutationFn: (playlistIds: readonly string[]) =>
      runSyncAll(playlistIds, async playlistId => {
        await apiClient().command(endpoints.syncPlaylist, { playlistId });
      }),
    /* One invalidation for the batch: the settle events arrive per playlist. */
    onSettled: () => {
      cacheEffects.everyPlaylistChanged(queryClient);
    }
  };
}

/** Start the frozen set one at a time and read the gallery once when it ends. */
export function useSyncAllPlaylists(): UseMutationResult<
  SyncAllOutcome,
  Error,
  readonly string[]
> {
  return useMutation(syncAllPlaylistsOptions(useQueryClient()));
}

export interface PinPlaylistVariables {
  readonly playlistId: string;
  readonly pinned: boolean;
}

export function updatePinOptions(queryClient: QueryClient) {
  return {
    mutationFn: ({ playlistId, pinned }: PinPlaylistVariables) =>
      apiClient().send(
        endpoints.pinPlaylist,
        { playlistId },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pinned })
        }
      ),
    onMutate: ({ playlistId, pinned }: PinPlaylistVariables) =>
      optimisticPatch<InfiniteData<PlaylistPage>>(
        queryClient,
        libraryKey,
        previous => pinPlaylistInPages(previous, playlistId, pinned)
      ),
    onError: (
      _error: unknown,
      _variables: PinPlaylistVariables,
      context: OptimisticContext<InfiniteData<PlaylistPage>> | undefined
    ) => {
      restoreOptimistic(queryClient, libraryKey, context);
    },
    onSuccess: () => {
      cacheEffects.libraryChanged(queryClient);
    }
  };
}

export function useUpdatePin() {
  return useMutation<
    Playlist,
    Error,
    PinPlaylistVariables,
    OptimisticContext<InfiniteData<PlaylistPage>>
  >(updatePinOptions(useQueryClient()));
}
