import type {
  PlaylistWithCounts,
  Problem,
  TrackFileStatusCounts,
  TrackFilterState
} from '@playliberty/contracts';
import {
  PlaylistSyncStatus,
  REMOTE_REMOVED,
  TrackFileStatus
} from '@playliberty/contracts';
import type { Messages, Translator } from '@playliberty/i18n';
import { problemDetail } from '@playliberty/i18n';

import { canWritePlaylist } from '../../access/access.js';

export type LibraryScope = 'all' | 'shared';

export const TRACK_STATUSES: readonly TrackFileStatus[] =
  Object.values(TrackFileStatus);

export interface StatusTotals {
  readonly counts: TrackFileStatusCounts;
  readonly remoteRemoved: number;
}

export interface PlaylistGroups {
  readonly pinned: readonly PlaylistWithCounts[];
  readonly syncing: readonly PlaylistWithCounts[];
  readonly rest: readonly PlaylistWithCounts[];
}

/* The chips read the scope they are drawn over: one total per status over every
 * playlist in that scope, with the retained figure beside the five buckets. */
export function statusTotals(
  items: readonly PlaylistWithCounts[]
): StatusTotals {
  const counts: TrackFileStatusCounts = {
    [TrackFileStatus.Stored]: 0,
    [TrackFileStatus.Pending]: 0,
    [TrackFileStatus.Downloading]: 0,
    [TrackFileStatus.Failed]: 0,
    [TrackFileStatus.Unavailable]: 0
  };
  let remoteRemoved = 0;

  for (const item of items) {
    for (const status of TRACK_STATUSES) {
      counts[status] += item.counts[status];
    }

    remoteRemoved += item.remoteRemoved;
  }

  return { counts, remoteRemoved };
}

/* A pin outranks a running first sync, so the transient group holds the
 * unpinned rows only. */
export function groupPlaylists(
  items: readonly PlaylistWithCounts[]
): PlaylistGroups {
  const pinned = items.filter(item => item.pinned);
  const unpinned = items.filter(item => !item.pinned);
  const syncing = unpinned.filter(
    item => item.syncStatus === PlaylistSyncStatus.Syncing
  );
  const rest = unpinned.filter(
    item => item.syncStatus !== PlaylistSyncStatus.Syncing
  );

  return { pinned, syncing, rest };
}

export interface BulkSyncNotice {
  readonly message: string;
  readonly detail: string | null;
}

export interface SyncBatch {
  readonly ids: readonly string[];
  /** The gallery read in force when the batch started. */
  readonly at: number;
}

/* The batch reports a refusal as the server's problem, so the notice builder
 * never needs the client's error type. */
export interface SyncAllOutcome {
  readonly started: number;
  readonly alreadyRunning: number;
  readonly stopped: Problem | null;
}

/* The rail's scope, then the chip: one owner for what the grid draws and what
 * the bulk sync counts. */
export function scopedPlaylists(
  items: readonly PlaylistWithCounts[],
  scope: LibraryScope
): readonly PlaylistWithCounts[] {
  return scope === 'shared'
    ? items.filter(item => item.access !== 'owner')
    : items;
}

export function visiblePlaylists(
  scopedItems: readonly PlaylistWithCounts[],
  statusFilter: TrackFilterState | null
): readonly PlaylistWithCounts[] {
  if (statusFilter === null) {
    return scopedItems;
  }

  return statusFilter === REMOTE_REMOVED
    ? scopedItems.filter(item => item.remoteRemoved > 0)
    : scopedItems.filter(item => item.counts[statusFilter] > 0);
}

/* The visible rail decides the set, then the writes that are idle. This is the
 * array a press freezes. */
export function syncablePlaylists(
  items: readonly PlaylistWithCounts[],
  scope: LibraryScope,
  statusFilter: TrackFilterState | null
): PlaylistWithCounts[] {
  return visiblePlaylists(scopedPlaylists(items, scope), statusFilter).filter(
    item =>
      canWritePlaylist(item) && item.syncStatus !== PlaylistSyncStatus.Syncing
  );
}

export function bulkSyncNoticeFor(
  t: Translator<Messages>,
  outcome: SyncAllOutcome
): BulkSyncNotice {
  if (outcome.stopped !== null) {
    return {
      message: t('library.syncAllStopped'),
      detail: problemDetail(t, outcome.stopped)
    };
  }

  if (outcome.started === 0) {
    return {
      message: t('library.syncAllNone', { count: outcome.alreadyRunning }),
      detail: null
    };
  }

  return {
    message: t('library.syncAllStarted', { count: outcome.started }),
    detail:
      outcome.alreadyRunning === 0
        ? null
        : t('library.syncAllRunning', { count: outcome.alreadyRunning })
  };
}

/* The batch holds while the loop runs, while any of its playlists still syncs,
 * and until a gallery read taken after the press lands. */
export function batchBusy(
  batch: SyncBatch | null,
  items: readonly PlaylistWithCounts[],
  dataUpdatedAt: number,
  pending: boolean
): boolean {
  if (batch === null) {
    return false;
  }

  const syncing = batch.ids.some(id =>
    items.some(
      item => item.id === id && item.syncStatus === PlaylistSyncStatus.Syncing
    )
  );

  return pending || syncing || dataUpdatedAt <= batch.at;
}
