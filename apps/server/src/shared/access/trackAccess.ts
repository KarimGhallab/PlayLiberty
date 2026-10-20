import { and, eq, sql } from 'drizzle-orm';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { associations, playlists } from '../../platform/database/schema.js';
import { playlistReaches } from './playlistAccess.js';
import { AccessNeed } from './rule.js';

/*
 * A track is instance-wide, keyed by video id: access through a playlist that
 * associates it. Its module because an unreachable track reads as a 403, not a
 * deleted one, where an unreachable playlist reads as a 404.
 */

function trackAllowed(
  database: DatabaseHandle,
  trackId: string,
  accountId: string,
  need: AccessNeed
): boolean {
  return (
    database.db
      .select({ allowed: sql<number>`1` })
      .from(associations)
      .innerJoin(playlists, eq(playlists.id, associations.playlistId))
      .where(
        and(eq(associations.trackId, trackId), playlistReaches(accountId, need))
      )
      .limit(1)
      .get() !== undefined
  );
}

export function canAccountAccessTrack(
  database: DatabaseHandle,
  trackId: string,
  accountId: string
): boolean {
  return trackAllowed(database, trackId, accountId, AccessNeed.Read);
}

/* Owner of a holding playlist or a write collaborator, not a read one. */
export function canAccountWriteTrack(
  database: DatabaseHandle,
  trackId: string,
  accountId: string
): boolean {
  return trackAllowed(database, trackId, accountId, AccessNeed.Write);
}
