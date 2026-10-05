import { eq } from 'drizzle-orm';

import { TrackFileStatus, TrackSourceStatus } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import { tracks } from '../../../platform/database/schema.js';

/*
 * A video that is gone from its source is not a failure: the track is kept and
 * marked removed from the source, and only a track with no stored file becomes
 * unavailable. The sync's retention pass and the download worker both reach this,
 * so a video that disappears between syncs and a download that finds it already
 * gone produce the same pair of values.
 */
export function markTrackSourceRemoved(
  database: DatabaseHandle,
  trackId: string,
  fileStatus: TrackFileStatus
): void {
  const rest =
    fileStatus === TrackFileStatus.Stored
      ? {}
      : { fileStatus: TrackFileStatus.Unavailable };
  database.db
    .update(tracks)
    .set({
      sourceStatus: TrackSourceStatus.Removed,
      ...rest,
      updatedAt: new Date().toISOString()
    })
    .where(eq(tracks.id, trackId))
    .run();
}
