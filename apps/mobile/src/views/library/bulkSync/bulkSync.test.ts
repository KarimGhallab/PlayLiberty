import { describe, expect, it } from '@jest/globals';

import {
  PlaylistSort,
  PlaylistSyncStatus,
  type PlaylistWithCounts,
  ProblemCode,
  Provider,
  ShareLevel,
  TrackFileStatus
} from '@playliberty/contracts';
import { Language, catalogs, createTranslator } from '@playliberty/i18n';

import { ApiError } from '../../../api/apiClient/ApiClient';
import { batchBusy, bulkSyncNoticeFor, syncablePlaylists } from './bulkSync';

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
    const stopped = new ApiError(503, {
      type: 'about:blank',
      title: 'Service unavailable',
      status: 503,
      code: ProblemCode.InternalError,
      detail: 'The library is unavailable.'
    });

    expect(
      bulkSyncNoticeFor(t, { started: 1, alreadyRunning: 0, stopped })
    ).toEqual({
      message: 'Sync all stopped',
      detail: 'The library is unavailable.'
    });
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
