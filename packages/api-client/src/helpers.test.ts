import { describe, expect, it } from 'vitest';

import type {
  AccountSummary,
  PlaylistPage,
  PlaylistWithCounts,
  SyncRun
} from '@playliberty/contracts';
import {
  PlaylistSort,
  PlaylistSyncStatus,
  ProblemCode,
  Provider
} from '@playliberty/contracts';

import { nextAccountsPageParam, ownerNameFrom } from './account.js';
import { ApiError } from './apiError.js';
import {
  createPlaylistPlaceholder,
  flattenPlaylistPages,
  nextLibraryPageOffset,
  runSyncAll
} from './library.js';
import { coverCropQuery, nextTracksPageParam } from './playlist.js';

const ITEM: PlaylistWithCounts = {
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
  counts: {
    stored: 0,
    pending: 0,
    downloading: 0,
    failed: 0,
    unavailable: 0
  },
  remoteRemoved: 0,
  createdAt: '2026-11-06T00:00:00.000Z',
  updatedAt: '2026-11-06T00:00:00.000Z'
};

function page(offset: number, count: number, total: number): PlaylistPage {
  return {
    items: Array.from({ length: count }, (_, index) => ({
      ...ITEM,
      id: `p${offset + index}`
    })),
    total,
    limit: 50,
    offset
  };
}

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

describe('the paging bounds', () => {
  it('asks for the next library offset until the total is loaded', () => {
    expect(nextLibraryPageOffset(page(0, 50, 51))).toBe(50);
    expect(nextLibraryPageOffset(page(50, 1, 51))).toBeUndefined();
    expect(nextLibraryPageOffset(page(50, 0, 51))).toBeUndefined();
  });

  it('asks for the next account offset until the total is loaded', () => {
    expect(nextAccountsPageParam(page(0, 50, 51))).toBe(50);
    expect(nextAccountsPageParam(page(50, 0, 51))).toBeUndefined();
  });

  it('asks for the next track offset until the total is loaded', () => {
    expect(nextTracksPageParam(page(0, 100, 101))).toBe(100);
    expect(nextTracksPageParam(page(100, 1, 101))).toBeUndefined();
  });

  it('flattens every loaded library page and keeps the server total', () => {
    const flat = flattenPlaylistPages({
      pages: [page(0, 2, 4), page(2, 2, 4)],
      pageParams: [0, 2]
    });

    expect(flat.items.map(item => item.id)).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(flat.total).toBe(4);
  });
});

describe('the directory name', () => {
  const directory: AccountSummary[] = [
    { id: 'a1', displayName: 'Ada', avatarUrl: null }
  ];

  it('resolves a present owner and misses an absent one', () => {
    expect(ownerNameFrom(directory, 'a1')).toBe('Ada');
    expect(ownerNameFrom(directory, 'a2')).toBeNull();
    expect(ownerNameFrom([], 'a1')).toBeNull();
  });
});

describe('the cover crop query', () => {
  it('sends the four fractions or nothing', () => {
    expect(coverCropQuery(null)).toBeUndefined();
    expect(coverCropQuery({ x: 1 / 3, y: 0, width: 1 / 3, height: 1 })).toEqual(
      {
        cropX: '0.333333',
        cropY: '0.000000',
        cropWidth: '0.333333',
        cropHeight: '1.000000'
      }
    );
  });
});

describe('the batch sync', () => {
  it('counts an already-running playlist and goes on', async () => {
    const started: string[] = [];
    const outcome = await runSyncAll(['p1', 'p2', 'p3'], async id => {
      if (id === 'p2') {
        throw new ApiError(409, {
          type: 'about:blank',
          title: 'Already running',
          status: 409,
          code: ProblemCode.SyncAlreadyRunning
        });
      }

      started.push(id);
    });

    expect(started).toEqual(['p1', 'p3']);
    expect(outcome).toEqual({ started: 2, alreadyRunning: 1, stopped: null });
  });

  it('stops on a refusal that is not already-running and reports its problem', async () => {
    const problem = {
      type: 'about:blank',
      title: 'Service unavailable',
      status: 503,
      code: ProblemCode.InternalError
    };
    const outcome = await runSyncAll(['p1', 'p2'], async id => {
      if (id === 'p2') {
        throw new ApiError(503, problem);
      }
    });

    expect(outcome).toEqual({
      started: 1,
      alreadyRunning: 0,
      stopped: problem
    });
  });
});

describe('the created playlist', () => {
  it('names the row from the source and marks it syncing', () => {
    const placeholder = createPlaylistPlaceholder(RUN, {
      url: 'https://www.youtube.com/playlist?list=PL1',
      skipNonMusic: true
    });

    expect(placeholder.id).toBe('p1');
    expect(placeholder.name).toBe('PL1');
    expect(placeholder.syncStatus).toBe(PlaylistSyncStatus.Syncing);
    expect(placeholder.skipNonMusic).toBe(true);
  });

  it('falls back to the video id for a bare track source', () => {
    const placeholder = createPlaylistPlaceholder(RUN, {
      url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
      skipNonMusic: false
    });

    expect(placeholder.name).toBe('aaaaaaaaaaa');
  });
});
