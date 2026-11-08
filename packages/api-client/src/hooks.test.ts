import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Playlist, SyncRun } from '@playliberty/contracts';
import {
  PlaylistSort,
  PlaylistSyncStatus,
  Provider
} from '@playliberty/contracts';
import {
  egressKey,
  libraryKey,
  playlistKey,
  playlistPrefix
} from '@playliberty/query';

import { checkEgressOptions, switchEgressOptions } from './egress.js';
import {
  createPlaylistOptions,
  syncAllPlaylistsOptions,
  updatePinOptions
} from './library.js';
import {
  addTrackOptions,
  deletePlaylistOptions,
  fetchTrackWholeOptions,
  grantShareOptions,
  removePlaylistCoverOptions,
  removeTrackOptions,
  renamePlaylistOptions,
  retryFailedTracksOptions,
  retryTrackOptions,
  revokeShareOptions,
  setPlaylistCoverOptions,
  syncPlaylistOptions,
  updateSkipNonMusicOptions,
  updateSortOptions
} from './playlist.js';

const RUN: SyncRun = {
  id: 'run-1',
  playlistId: 'p1',
  status: 'running',
  addedCount: 0,
  retainedCount: 0,
  removedCount: 0,
  failedCount: 0,
  startedAt: '2026-11-06T00:00:00.000Z',
  finishedAt: null,
  error: null
};

const PLAYLIST: Playlist = {
  id: 'p1',
  ownerAccountId: 'a1',
  name: 'Morning',
  coverTrackId: null,
  coverUpdatedAt: null,
  provider: Provider.Youtube,
  sourcePlaylistId: 'PL1',
  syncStatus: PlaylistSyncStatus.Idle,
  lastSyncedAt: null,
  trackCount: 0,
  skipNonMusic: true,
  sort: PlaylistSort.Playlist,
  access: 'owner',
  hasShares: false,
  pinned: false,
  createdAt: '2026-11-06T00:00:00.000Z',
  updatedAt: '2026-11-06T00:00:00.000Z'
};

function queryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
}

describe('the mutation invalidations', () => {
  let client: QueryClient;
  let invalidate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    client = queryClient();
    invalidate = vi.spyOn(client, 'invalidateQueries');
  });

  function invalidated(key: readonly unknown[]): boolean {
    const wanted = JSON.stringify(key);

    return invalidate.mock.calls.some(
      ([filters]) =>
        JSON.stringify(
          (filters as { queryKey?: readonly unknown[] } | undefined)?.queryKey
        ) === wanted
    );
  }

  it('creating a playlist refreshes the library', () => {
    createPlaylistOptions(client).onSuccess(RUN, {
      url: 'https://www.youtube.com/playlist?list=PL1',
      skipNonMusic: true
    });

    expect(invalidated(libraryKey)).toBe(true);
  });

  it('starting every sync refreshes every playlist read', () => {
    syncAllPlaylistsOptions(client).onSettled();

    expect(invalidated(playlistPrefix)).toBe(true);
    expect(invalidated(libraryKey)).toBe(true);
  });

  it('pinning refreshes the library', () => {
    updatePinOptions(client).onSuccess();

    expect(invalidated(libraryKey)).toBe(true);
  });

  it('starting one sync refreshes the playlist and the library', () => {
    syncPlaylistOptions(client).onSuccess(undefined, 'p1');

    expect(invalidated(playlistKey('p1'))).toBe(true);
    expect(invalidated(libraryKey)).toBe(true);
  });

  it('adding a track refreshes every playlist read', () => {
    addTrackOptions(client).onSuccess();

    expect(invalidated(playlistPrefix)).toBe(true);
    expect(invalidated(libraryKey)).toBe(true);
  });

  it('setting a cover writes the playlist and refreshes both reads', () => {
    setPlaylistCoverOptions(client).onSuccess(PLAYLIST, {
      playlistId: 'p1',
      file: new Blob(['cover'], { type: 'image/jpeg' }),
      crop: null
    });

    expect(client.getQueryData(playlistKey('p1'))).toEqual(PLAYLIST);
    expect(invalidated(playlistKey('p1'))).toBe(true);
    expect(invalidated(libraryKey)).toBe(true);
  });

  it('removing a cover clears the version and refreshes both reads', () => {
    client.setQueryData(playlistKey('p1'), PLAYLIST);
    removePlaylistCoverOptions(client).onSuccess(undefined, 'p1');

    expect(client.getQueryData(playlistKey('p1'))).toMatchObject({
      coverUpdatedAt: null
    });
    expect(invalidated(playlistKey('p1'))).toBe(true);
    expect(invalidated(libraryKey)).toBe(true);
  });

  it('renaming refreshes the playlist and the library', () => {
    renamePlaylistOptions(client).onSuccess(PLAYLIST, {
      playlistId: 'p1',
      name: 'Evening'
    });

    expect(invalidated(playlistKey('p1'))).toBe(true);
    expect(invalidated(libraryKey)).toBe(true);
  });

  it('the skip switch refreshes the library', () => {
    updateSkipNonMusicOptions('p1', client).onSuccess(PLAYLIST);

    expect(invalidated(libraryKey)).toBe(true);
  });

  it('the sort refreshes the playlist reads', () => {
    updateSortOptions('p1', client).onSuccess(PLAYLIST);

    expect(invalidated(playlistKey('p1'))).toBe(true);
    expect(invalidated(libraryKey)).toBe(true);
  });

  it('deleting resets the playlist and refreshes the library', () => {
    const reset = vi.spyOn(client, 'resetQueries');
    deletePlaylistOptions(client).onSuccess(undefined, 'p1');

    expect(reset).toHaveBeenCalled();
    expect(invalidated(libraryKey)).toBe(true);
  });

  it('retrying one track refreshes the playlist', () => {
    retryTrackOptions('p1', client).onSuccess();

    expect(invalidated(playlistKey('p1'))).toBe(true);
    expect(invalidated(libraryKey)).toBe(true);
  });

  it('retrying the failed set refreshes the playlist', () => {
    retryFailedTracksOptions('p1', client).onSettled();

    expect(invalidated(playlistKey('p1'))).toBe(true);
    expect(invalidated(libraryKey)).toBe(true);
  });

  it('fetching whole refreshes the playlist', () => {
    fetchTrackWholeOptions('p1', client).onSuccess();

    expect(invalidated(playlistKey('p1'))).toBe(true);
    expect(invalidated(libraryKey)).toBe(true);
  });

  it('removing a track refreshes the playlist', () => {
    removeTrackOptions('p1', client).onSuccess();

    expect(invalidated(playlistKey('p1'))).toBe(true);
    expect(invalidated(libraryKey)).toBe(true);
  });

  it('granting and revoking refresh the playlist', () => {
    grantShareOptions('p1', client).onSuccess();
    revokeShareOptions('p1', client).onSuccess();

    expect(invalidated(playlistKey('p1'))).toBe(true);
    expect(invalidated(libraryKey)).toBe(true);
  });

  it('an egress answer writes the pool read', () => {
    const read = { agentReachable: true, configs: [] };
    switchEgressOptions(client).onSuccess(read);
    checkEgressOptions(client).onSuccess(read);

    expect(client.getQueryData(egressKey)).toEqual(read);
  });
});
