import { useCallback, useEffect, useState } from 'react';

import type { UseMutationResult } from '@tanstack/react-query';

import type {
  PlaylistWithCounts,
  TrackFilterState
} from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';
import type {
  BulkSyncNotice,
  LibraryScope,
  SyncAllOutcome,
  SyncBatch
} from '@playliberty/library';
import {
  batchBusy,
  bulkSyncNoticeFor,
  syncablePlaylists
} from '@playliberty/library';

export interface BulkSync {
  readonly count: number;
  readonly busy: boolean;
  readonly notice: BulkSyncNotice | null;
  readonly start: () => void;
  readonly dismissNotice: () => void;
}

export interface BulkSyncStatus {
  readonly busy: boolean;
  readonly count: number;
}

/* The count the control shows: the frozen batch while it holds, the syncable
 * set otherwise. */
export function bulkSyncStatus(
  batch: SyncBatch | null,
  items: readonly PlaylistWithCounts[],
  dataUpdatedAt: number,
  pending: boolean,
  syncableCount: number
): BulkSyncStatus {
  const busy =
    batch !== null && batchBusy(batch, items, dataUpdatedAt, pending);

  return {
    busy,
    count: busy && batch !== null ? batch.ids.length : syncableCount
  };
}

export function bulkSyncSettled(
  batch: SyncBatch | null,
  items: readonly PlaylistWithCounts[],
  dataUpdatedAt: number,
  pending: boolean
): boolean {
  return (
    batch !== null && !pending && !batchBusy(batch, items, dataUpdatedAt, false)
  );
}

/* The gallery's bulk sync: the count the control shows, the frozen batch behind
 * the press, and the tally the notice draws. The policy lives in `library`. */
export function useBulkSync(
  items: readonly PlaylistWithCounts[],
  dataUpdatedAt: number,
  scope: LibraryScope,
  statusFilter: TrackFilterState | null,
  syncAll: UseMutationResult<SyncAllOutcome, Error, readonly string[]>
): BulkSync {
  const { t } = useI18n();
  const [batch, setBatch] = useState<SyncBatch | null>(null);
  const [notice, setNotice] = useState<BulkSyncNotice | null>(null);
  const syncable = syncablePlaylists(items, scope, statusFilter);
  const { busy, count } = bulkSyncStatus(
    batch,
    items,
    dataUpdatedAt,
    syncAll.isPending,
    syncable.length
  );

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
    if (!bulkSyncSettled(batch, items, dataUpdatedAt, syncAll.isPending)) {
      return;
    }

    setBatch(null);
  }, [batch, dataUpdatedAt, items, syncAll.isPending]);

  return { count, busy, notice, start, dismissNotice };
}
