import { describe, expect, it } from 'vitest';

import type { Problem } from '@playliberty/contracts';
import {
  PlaylistSort,
  PlaylistSyncStatus,
  ProblemCode,
  Provider,
  REMOTE_REMOVED,
  ShareLevel,
  TrackFileStatus
} from '@playliberty/contracts';
import type { PlaylistWithCounts } from '@playliberty/contracts';
import { Language, catalogs, createTranslator } from '@playliberty/i18n';

import {
  batchBusy,
  bulkSyncNoticeFor,
  groupPlaylists,
  statusTotals,
  syncablePlaylists
} from './librarySync.js';

const counts = {
  stored: 0,
  pending: 0,
  downloading: 0,
  failed: 0,
  unavailable: 0
};

const base: PlaylistWithCounts = {
  id: 'base',
  ownerAccountId: 'account-1',
  name: 'Base',
  coverTrackId: null,
  coverUpdatedAt: null,
  provider: Provider.Youtube,
  sourcePlaylistId: 'PL-base',
  syncStatus: PlaylistSyncStatus.Idle,
  lastSyncedAt: null,
  trackCount: 1,
  skipNonMusic: true,
  sort: PlaylistSort.Playlist,
  access: 'owner',
  hasShares: false,
  pinned: false,
  counts,
  remoteRemoved: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z'
};

function playlist(
  id: string,
  overrides: Partial<PlaylistWithCounts> = {}
): PlaylistWithCounts {
  return { ...base, id, ...overrides };
}

const t = createTranslator(catalogs[Language.English], Language.English);

describe('the syncable set', () => {
  const items = [
    playlist('owner'),
    playlist('shared-write', {
      access: ShareLevel.Write,
      ownerAccountId: 'account-2'
    }),
    playlist('shared-read', {
      access: ShareLevel.Read,
      ownerAccountId: 'account-2'
    }),
    playlist('running', { syncStatus: PlaylistSyncStatus.Syncing }),
    playlist('failed', { counts: { ...counts, failed: 1 } })
  ];

  it('counts what the account can write and is not already syncing', () => {
    expect(syncablePlaylists(items, 'all', null).map(item => item.id)).toEqual([
      'owner',
      'shared-write',
      'failed'
    ]);
  });

  it('narrows to the shared scope', () => {
    expect(
      syncablePlaylists(items, 'shared', null).map(item => item.id)
    ).toEqual(['shared-write']);
  });

  it('narrows to the status chip', () => {
    expect(
      syncablePlaylists(items, 'all', TrackFileStatus.Failed).map(
        item => item.id
      )
    ).toEqual(['failed']);
  });

  it('narrows to the retained view', () => {
    expect(
      syncablePlaylists(
        [...items, playlist('retained', { remoteRemoved: 1 })],
        'all',
        REMOTE_REMOVED
      ).map(item => item.id)
    ).toEqual(['retained']);
  });
});

describe('the bulk sync tally', () => {
  it('names what started and what was already running', () => {
    expect(
      bulkSyncNoticeFor(t, { started: 3, alreadyRunning: 2, stopped: null })
    ).toEqual({
      message: 'Started 3 syncs',
      detail: '2 are already running'
    });
  });

  it('names the already running set when nothing started', () => {
    expect(
      bulkSyncNoticeFor(t, { started: 0, alreadyRunning: 2, stopped: null })
    ).toEqual({
      message: 'All 2 playlists are already syncing',
      detail: null
    });
  });

  it('names the refusal that stopped the loop', () => {
    const stopped: Problem = {
      type: 'about:blank',
      title: 'Service unavailable',
      status: 503,
      code: ProblemCode.InternalError,
      detail: 'The library is unavailable.'
    };

    expect(
      bulkSyncNoticeFor(t, { started: 1, alreadyRunning: 0, stopped })
    ).toEqual({
      message: 'Sync all stopped',
      detail: 'The library is unavailable.'
    });
  });
});

describe('the gallery totals', () => {
  it('sums the five buckets and the retained count', () => {
    const items = [
      playlist('a', {
        counts: { ...counts, stored: 2, failed: 1 },
        remoteRemoved: 3
      }),
      playlist('b', {
        counts: { ...counts, stored: 1, unavailable: 2 },
        remoteRemoved: 4
      })
    ];

    expect(statusTotals(items)).toEqual({
      counts: { ...counts, stored: 3, failed: 1, unavailable: 2 },
      remoteRemoved: 7
    });
  });
});

describe('the gallery groups', () => {
  it('draws pinned, syncing and rest in that order', () => {
    const items = [
      playlist('sync', { syncStatus: PlaylistSyncStatus.Syncing }),
      playlist('rest'),
      playlist('pinned', { pinned: true })
    ];
    const groups = groupPlaylists(items);

    expect(Object.keys(groups)).toEqual(['pinned', 'syncing', 'rest']);
    expect(groups.pinned.map(item => item.id)).toEqual(['pinned']);
    expect(groups.syncing.map(item => item.id)).toEqual(['sync']);
    expect(groups.rest.map(item => item.id)).toEqual(['rest']);
  });

  it('keeps a pinned playlist out of the syncing group while it syncs', () => {
    const groups = groupPlaylists([
      playlist('both', { pinned: true, syncStatus: PlaylistSyncStatus.Syncing })
    ]);

    expect(groups.pinned.map(item => item.id)).toEqual(['both']);
    expect(groups.syncing).toEqual([]);
  });
});

describe('the batch busy state', () => {
  const batch = { ids: ['a', 'b'], at: 100 };

  it('holds while the loop is pending', () => {
    expect(batchBusy(batch, [], 100, true)).toBe(true);
  });

  it('holds until a read taken after the press', () => {
    expect(batchBusy(batch, [], 100, false)).toBe(true);
  });

  it('holds while a started playlist still runs', () => {
    const items = [playlist('a', { syncStatus: PlaylistSyncStatus.Syncing })];

    expect(batchBusy(batch, items, 101, false)).toBe(true);
  });

  it('ends when a later read finds none of the batch running', () => {
    expect(batchBusy(batch, [playlist('a')], 101, false)).toBe(false);
  });
});
