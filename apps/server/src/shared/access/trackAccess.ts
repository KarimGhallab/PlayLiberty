import { ShareLevel } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../platform/database/client.js';

/*
 * A track is instance-wide, keyed by video id: access through a playlist that
 * associates it. Its module because an unreachable track reads as a 403, not
 * a deleted one, where an unreachable playlist reads as a 404.
 */
const TRACK_ACCESS_SQL = `
  select 1 as allowed
  from association a
  join playlist p on p.id = a.playlist_id
  where a.track_id = ?
    and (
      p.owner_account_id = ?
      or exists (select 1 from share s where s.playlist_id = p.id and s.account_id = ?)
    )
  limit 1
`;

export function canAccountAccessTrack(
  database: DatabaseHandle,
  trackId: string,
  accountId: string
): boolean {
  return (
    database.sqlite
      .prepare(TRACK_ACCESS_SQL)
      .get(trackId, accountId, accountId) !== undefined
  );
}

/* Owner of a holding playlist or a write collaborator, not a read one. The
 * level is a parameter, so a new share level cannot drift out of the SQL. */
const TRACK_WRITE_ACCESS_SQL = `
  select 1 as allowed
  from association a
  join playlist p on p.id = a.playlist_id
  where a.track_id = ?
    and (
      p.owner_account_id = ?
      or exists (
        select 1 from share s
        where s.playlist_id = p.id
          and s.account_id = ?
          and s.level = ?
      )
    )
  limit 1
`;

export function canAccountWriteTrack(
  database: DatabaseHandle,
  trackId: string,
  accountId: string
): boolean {
  return (
    database.sqlite
      .prepare(TRACK_WRITE_ACCESS_SQL)
      .get(trackId, accountId, accountId, ShareLevel.Write) !== undefined
  );
}
