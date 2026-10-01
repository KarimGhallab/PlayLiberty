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
  // Existence and visibility collapse into one outcome, which is the difference
  // from the track route. That route answers 403 for a track the account cannot
  // reach, and it needs the distinction: a client rendering the track row has to
  // tell "you cannot play this" from "this is not here". A playlist screen has no
  // such case, and the design record's not-found state covers a playlist that was
  // shared to the account and is not any more, which a user reads as gone rather
  // than as forbidden. So both arrive here as 404, and a route must not confirm
  // the existence of a playlist it will not show.
  if (resolvePlaylistAccess(database, playlistId, accountId) === null) {
    return { outcome: SyncRunOutcome.PlaylistNotFound };
  }

  const row = database.db
    .select()
    .from(syncRuns)
    .where(eq(syncRuns.playlistId, playlistId))
    /*
     * Latest by started_at, with rowid breaking a tie. Two runs can start inside
     * the same millisecond, and started_at alone would then pick an arbitrary one
     * of them, so the same request could report different figures on two calls.
     * No declared column is monotonic on insert, so the tiebreak is insertion
     * order, which is what rowid is.
     *
     * Qualified for the same reason the playlist listing qualifies its own: the
     * fallback is ambiguous the moment more than one table is in play.
     *
     * The row is returned as it comes back rather than mapped field by field, and
     * that is not a shortcut. Drizzle maps its own column names on the way out of
     * the query builder, so the row is already the contract's shape; a bare
     * prepare() does not, so a bare `select *` would put undefined into fields
     * the contract types as strings. The mapping also fails to compile if
     * SyncRunSchema gained a field, and so does this: a new contract field is
     * absent from the Drizzle row, and returning the row as a SyncRun stops the
     * build in the same place.
     */
    .orderBy(desc(syncRuns.startedAt), desc(sql`${syncRuns}.rowid`))
    .limit(1)
    .get();

  if (row === undefined) {
    return { outcome: SyncRunOutcome.RunAbsent };
  }

  return { outcome: SyncRunOutcome.Ok, run: row };
}
