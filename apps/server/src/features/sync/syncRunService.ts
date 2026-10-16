import { desc, eq, sql } from 'drizzle-orm';

import { resolvePlaylistAccess } from '../../shared/access/playlistAccess.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { syncRuns } from '../../platform/database/schema.js';
import { SyncRunOutcome } from './types.js';
import type { SyncRunResult } from './types.js';

export function resolveLatestSyncRun(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): SyncRunResult {
  // Existence and visibility collapse to a 404, unlike the track route's 403.
  // A playlist screen has no such case, and a route must not confirm existence.
  if (resolvePlaylistAccess(database, playlistId, accountId) === null) {
    return { outcome: SyncRunOutcome.PlaylistNotFound };
  }

  const row = database.db
    .select()
    .from(syncRuns)
    .where(eq(syncRuns.playlistId, playlistId))
    /* Latest by started_at, rowid breaking a tie: two runs can start in one
     * millisecond, so started_at alone could report different figures. */
    .orderBy(desc(syncRuns.startedAt), desc(sql`${syncRuns}.rowid`))
    .limit(1)
    .get();

  if (row === undefined) {
    return { outcome: SyncRunOutcome.RunAbsent };
  }

  return { outcome: SyncRunOutcome.Ok, run: row };
}
