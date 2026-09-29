import type { SyncRun, SyncRunStatus } from '@playliberty/contracts';

import type { DatabaseHandle } from '../db/client.js';
import { SyncRunOutcome } from './types.js';
import type { SyncRunResult } from './types.js';

// The same access rule GET /tracks/:id/stream applies: an account may read a
// playlist's run if it owns the playlist or holds a share on it. There is no
// global library and admin carries no override, so this is the whole rule.
//
// Existence and visibility are decided together and collapse into one outcome,
// which is the difference from the track route. That route answers 403 for a
// track the account cannot reach, and it needs the distinction: a client
// rendering the track row has to tell "you cannot play this" from "this is not
// here". A playlist screen has no such case, and the design record's not-found
// state covers a playlist that was shared to the account and is not any more,
// which a user reads as gone rather than as forbidden. So this route answers 404
// for both and does not confirm the existence of a playlist it will not show.
const PLAYLIST_ACCESS_SQL = `
  select 1 as allowed
  from playlist p
  where p.id = ?
    and (
      p.owner_account_id = ?
      or exists (select 1 from share s where s.playlist_id = p.id and s.account_id = ?)
    )
  limit 1
`;

// Latest by started_at, with rowid breaking a tie. Two runs can start inside the
// same millisecond, and started_at alone would then pick an arbitrary one of
// them, so the same request could report different figures on two calls. No
// declared column is monotonic on insert, so the tiebreak is insertion order.
const LATEST_RUN_SQL = `
  select *
  from sync_run
  where playlist_id = ?
  order by started_at desc, rowid desc
  limit 1
`;

// Raw SQL hands back the column names as they are written in the table, so this
// record is snake_case where the contract is camelCase. A first pass cast the raw
// row to the Drizzle row type, which renamed nothing and put undefined into every
// timestamp: Drizzle maps its own column names on the way out of its query
// builder and a bare prepare() never goes through it. The type is declared from
// the statement above instead, and the mapping below is the renaming.
interface SyncRunRecord {
  id: string;
  playlist_id: string;
  status: SyncRunStatus;
  added_count: number;
  retained_count: number;
  removed_count: number;
  failed_count: number;
  started_at: string;
  finished_at: string | null;
  error: string | null;
}

/*
 * The mapping is the whole of the row-to-contract translation, and it is written
 * out field by field for two reasons: it is the place the ten promised fields are
 * named, and it fails to compile if SyncRunSchema gains one, which a spread over
 * the row would not. The timestamps pass through as stored, which is an ISO
 * string from new Date().toISOString(), and SyncRunSchema is what decides whether
 * that is an acceptable datetime.
 */
function toSyncRun(record: SyncRunRecord): SyncRun {
  return {
    id: record.id,
    playlistId: record.playlist_id,
    status: record.status,
    addedCount: record.added_count,
    retainedCount: record.retained_count,
    removedCount: record.removed_count,
    failedCount: record.failed_count,
    startedAt: record.started_at,
    finishedAt: record.finished_at,
    error: record.error
  };
}

function canAccountAccessPlaylist(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): boolean {
  const row = database.sqlite
    .prepare(PLAYLIST_ACCESS_SQL)
    .get(playlistId, accountId, accountId);
  return row !== undefined;
}

export function resolveLatestSyncRun(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): SyncRunResult {
  if (!canAccountAccessPlaylist(database, playlistId, accountId)) {
    return { outcome: SyncRunOutcome.PlaylistNotFound };
  }

  const row = database.sqlite
    .prepare<[string], SyncRunRecord>(LATEST_RUN_SQL)
    .get(playlistId);

  if (row === undefined) {
    return { outcome: SyncRunOutcome.RunAbsent };
  }

  return { outcome: SyncRunOutcome.Ok, run: toSyncRun(row) };
}
