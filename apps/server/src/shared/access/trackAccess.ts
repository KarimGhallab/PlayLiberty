import { ShareLevel } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../platform/database/client.js';

/*
 * Who may reach a track. A track has no owner and no share of its own: it is
 * instance-wide, keyed by video id, and the media store is deduplicated across
 * every account. So access to one is access to it through a playlist that
 * associates it, which is the same rule playlistAccess states, asked of a
 * different row.
 *
 * It stays its own module because the answer is a different question with a
 * different consequence. A playlist this account cannot reach is a 404, and the
 * client renders its not-found state. A track it cannot reach is a 403, because a
 * track row has to tell "you cannot play this" apart from "this is not here", and
 * the track row in the design system needs the difference. Collapsing the two
 * would make a revoked share indistinguishable from a deleted track, and a
 * playlist's answer has to stay the one the playlist routes already give.
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

/*
 * Write access to a track, which is the owner of a playlist that holds it or a
 * write collaborator on one, and not a read collaborator. A track is instance-wide
 * and has no owner of its own, so the right to act on it is the right to write one
 * of the playlists it is associated with. The level is a parameter rather than a
 * literal so a new share level cannot drift out of this statement.
 */
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
