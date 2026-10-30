import { useCallback, useEffect, useState } from 'react';

import { PlaylistSyncStatus, ShareLevel } from '@playliberty/contracts';
import type {
  PlaylistWithCounts,
  TrackFileStatus
} from '@playliberty/contracts';
import type { Messages, Translator } from '@playliberty/i18n';
import { problemDetail, useI18n } from '@playliberty/i18n';

import { ApiError } from '../../../api/apiClient/ApiClient';
import { useSyncAllPlaylists } from '../../../api/useSyncAllPlaylists';
import type { SyncAllOutcome } from '../../../api/useSyncAllPlaylists';
import type { LibraryScope } from '../GalleryFilterBar/GalleryFilterBar';

export interface BulkSyncNotice {
  readonly message: string;
  readonly detail: string | null;
}

export interface SyncBatch {
  readonly ids: readonly string[];
  /** The gallery read in force when the batch started. */
  readonly at: number;
}

export interface BulkSync {
  readonly count: number;
  readonly busy: boolean;
  readonly notice: BulkSyncNotice | null;
  readonly start: () => void;
  readonly dismissNotice: () => void;
}

/* The account may write its own playlist or one shared with a write grant; a
 * read share and an unloaded playlist are both out. */
export function canWritePlaylist(playlist: PlaylistWithCounts): boolean {
  return playlist.access === 'owner' || playlist.access === ShareLevel.Write;
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
  statusFilter: TrackFileStatus | null
): readonly PlaylistWithCounts[] {
  return statusFilter === null
    ? scopedItems
    : scopedItems.filter(item => item.counts[statusFilter] > 0);
}

/* The visible rail decides the set, then the writes that are idle. This is the
 * array a press freezes. */
export function syncablePlaylists(
  items: readonly PlaylistWithCounts[],
  scope: LibraryScope,
  statusFilter: TrackFileStatus | null
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
      detail: problemDetail(
        t,
        outcome.stopped instanceof ApiError ? outcome.stopped.problem : null
      )
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

/* The header's bulk sync: the count the rail shows, the frozen batch behind the
 * press, and the tally the notice draws. */
export function useBulkSync(
  items: readonly PlaylistWithCounts[],
  dataUpdatedAt: number,
  scope: LibraryScope,
  statusFilter: TrackFileStatus | null
): BulkSync {
  const { t } = useI18n();
  const syncAll = useSyncAllPlaylists();
  const [batch, setBatch] = useState<SyncBatch | null>(null);
  const [notice, setNotice] = useState<BulkSyncNotice | null>(null);
  const syncable = syncablePlaylists(items, scope, statusFilter);
  const batchSyncing =
    batch !== null &&
    batch.ids.some(id =>
      items.some(
        item => item.id === id && item.syncStatus === PlaylistSyncStatus.Syncing
      )
    );
  const busy =
    batch !== null &&
    (syncAll.isPending || batchSyncing || dataUpdatedAt <= batch.at);
  const count = busy && batch !== null ? batch.ids.length : syncable.length;

  const start = (): void => {
    if (syncable.length === 0) {
      return;
    }

    const ids = syncable.map(item => item.id);

    setBatch({ ids, at: dataUpdatedAt });
    syncAll.mutate(ids, {
      onSuccess: outcome => setNotice(bulkSyncNoticeFor(t, outcome))
    });
  };

  const dismissNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    if (batch === null || syncAll.isPending) {
      return;
    }

    if (batchBusy(batch, items, dataUpdatedAt, false)) {
      return;
    }

    setBatch(null);
  }, [batch, dataUpdatedAt, items, syncAll.isPending]);

  return { count, busy, notice, start, dismissNotice };
}
