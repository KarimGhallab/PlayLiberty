import { eq } from 'drizzle-orm';

import { PlaylistSyncStatus, SyncRunStatus } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../../../platform/database/client.js';
import { playlists, syncRuns } from '../../../../platform/database/schema.js';

export const INTERRUPTED_SYNC_ERROR =
  'The sync was interrupted by a server restart.';

export interface RecoveryResult {
  runsFailed: number;
  playlistsErrored: number;
}

/* Repairs the rows a stopped process left behind, in one transaction. The two
 * updates are independent, so an orphaned run or playlist is repaired too. */
export function recoverInterruptedSyncs(
  database: DatabaseHandle
): RecoveryResult {
  return database.unitOfWork(() => {
    const finishedAt = new Date().toISOString();

    const failedRuns = database.db
      .update(syncRuns)
      .set({
        status: SyncRunStatus.Failed,
        error: INTERRUPTED_SYNC_ERROR,
        finishedAt
      })
      .where(eq(syncRuns.status, SyncRunStatus.Running))
      .run();

    const erroredPlaylists = database.db
      .update(playlists)
      .set({
        syncStatus: PlaylistSyncStatus.Error,
        updatedAt: finishedAt
      })
      .where(eq(playlists.syncStatus, PlaylistSyncStatus.Syncing))
      .run();

    return {
      runsFailed: failedRuns.changes,
      playlistsErrored: erroredPlaylists.changes
    };
  });
}
