import { eq } from 'drizzle-orm';

import { TrackFileStatus } from '@playliberty/contracts';

import type { DatabaseHandle } from '../db/client.js';
import { tracks } from '../db/schema.js';
import type { TrackRow } from '../db/schema.js';
import { TrackStreamOutcome, TrackThumbnailOutcome } from './types.js';
import type { TrackStreamResult, TrackThumbnailResult } from './types.js';

// Authorizing access to a track is security-critical and reads cleanly as one
// SQL statement: an account may stream a track if it owns, or holds a share on,
// any playlist that associates the track. There is no global library, and admin
// carries no override, so this is the whole rule.
const ACCESS_SQL = `
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

function loadTrack(
  database: DatabaseHandle,
  trackId: string
): TrackRow | undefined {
  return database.db.select().from(tracks).where(eq(tracks.id, trackId)).get();
}

function canAccountAccessTrack(
  database: DatabaseHandle,
  trackId: string,
  accountId: string
): boolean {
  const row = database.sqlite
    .prepare(ACCESS_SQL)
    .get(trackId, accountId, accountId);
  return row !== undefined;
}

export function resolveTrackForStream(
  database: DatabaseHandle,
  trackId: string,
  accountId: string
): TrackStreamResult {
  const track = loadTrack(database, trackId);

  if (track === undefined) {
    return { outcome: TrackStreamOutcome.NotFound };
  }

  if (!canAccountAccessTrack(database, track.id, accountId)) {
    return { outcome: TrackStreamOutcome.Forbidden };
  }

  if (track.fileStatus !== TrackFileStatus.Stored || track.filePath === null) {
    return { outcome: TrackStreamOutcome.NotStored };
  }

  return { outcome: TrackStreamOutcome.Ok, filePath: track.filePath };
}

export function resolveTrackForThumbnail(
  database: DatabaseHandle,
  trackId: string,
  accountId: string
): TrackThumbnailResult {
  const track = loadTrack(database, trackId);

  if (track === undefined || track.thumbnailPath === null) {
    return { outcome: TrackThumbnailOutcome.NotFound };
  }

  if (!canAccountAccessTrack(database, track.id, accountId)) {
    return { outcome: TrackThumbnailOutcome.Forbidden };
  }

  return {
    outcome: TrackThumbnailOutcome.Ok,
    thumbnailPath: track.thumbnailPath
  };
}
