import { and, eq, sql } from 'drizzle-orm';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { associations, playlists } from '../../platform/database/schema.js';
import { playlistReaches } from './playlistAccess.js';
import { AccessNeed } from './rule.js';

/*
 * A track is instance-wide, keyed by video id. Reading it is the instance's;
 * only a write, which spends the download capacity, needs a holding playlist.
 */

function trackWriteAllowed(
  database: DatabaseHandle,
  trackId: string,
  accountId: string
): boolean {
  return (
    database.db
      .select({ allowed: sql<number>`1` })
      .from(associations)
      .innerJoin(playlists, eq(playlists.id, associations.playlistId))
      .where(
        and(
          eq(associations.trackId, trackId),
          playlistReaches(accountId, AccessNeed.Write)
        )
      )
      .limit(1)
      .get() !== undefined
  );
}

/* Owner of a holding playlist or a write collaborator, not a read one. */
export function canAccountWriteTrack(
  database: DatabaseHandle,
  trackId: string,
  accountId: string
): boolean {
  return trackWriteAllowed(database, trackId, accountId);
}
