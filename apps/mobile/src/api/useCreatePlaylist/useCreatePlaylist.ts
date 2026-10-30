import type { InfiniteData } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  CreatePlaylistInput,
  PlaylistPage,
  PlaylistWithCounts,
  SyncRun
} from '@playliberty/contracts';
import {
  PlaylistSort,
  PlaylistSyncStatus,
  Provider,
  endpoints
} from '@playliberty/contracts';
import { cacheEffects, libraryKey } from '@playliberty/query';

import { apiClient } from '../client';
import { insertPlaylistInPages } from '../playlistCache';

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
    createdAt: now,
    updatedAt: now
  };
}

/* A `202` with the started run; the new playlist is shown syncing at once, and
 * the gallery reads the server's row after the hold. No refusal is cached. */
export function useCreatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePlaylistInput) =>
      apiClient.send(
        endpoints.createPlaylist,
        {},
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        }
      ),
    onSuccess: (run, input) => {
      const previous =
        queryClient.getQueryData<InfiniteData<PlaylistPage>>(libraryKey);

      if (previous !== undefined) {
        queryClient.setQueryData<InfiniteData<PlaylistPage>>(
          libraryKey,
          insertPlaylistInPages(previous, createPlaylistPlaceholder(run, input))
        );
      }

      setTimeout(() => {
        cacheEffects.libraryChanged(queryClient);
      }, SYNCING_HOLD_MS);
    }
  });
}
