import { desc, eq, sql } from 'drizzle-orm';

import {
  AccessNeed,
  EntryOutcome,
  playlistEntry
} from '../../shared/access/entry/entry.js';
import { Refusal } from '../../shared/refusal.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { syncRuns } from '../../platform/database/schema.js';
import type { SyncRunResult } from './types.js';

export function resolveLatestSyncRun(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): SyncRunResult {
  const entry = playlistEntry(
    database,
    playlistId,
    accountId,
    AccessNeed.Read,
    () =>
      database.db
        .select()
        .from(syncRuns)
        .where(eq(syncRuns.playlistId, playlistId))
        /* Latest by started_at, rowid breaking a tie: two runs can start in one
         * millisecond, so started_at alone could report different figures. */
        .orderBy(desc(syncRuns.startedAt), desc(sql`${syncRuns}.rowid`))
        .limit(1)
        .get()
  );

  // Existence and visibility collapse to a 404, unlike the track route's 403.
  // A playlist screen has no such case, and a route must not confirm existence.
  if (entry.outcome === EntryOutcome.Denied) {
    return { outcome: 'refused', refusal: Refusal.PlaylistNotFoundRead };
  }

  if (entry.value === undefined) {
    return { outcome: 'refused', refusal: Refusal.SyncRunAbsent };
  }

  return { outcome: 'ok', run: entry.value };
}
