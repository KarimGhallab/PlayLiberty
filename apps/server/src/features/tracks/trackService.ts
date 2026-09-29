import { eq } from 'drizzle-orm';

import { TrackFileStatus } from '@playliberty/contracts';

import { canAccountAccessTrack } from '../../shared/access/trackAccess.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { tracks } from '../../platform/database/schema.js';
import type { TrackRow } from '../../platform/database/schema.js';
import { TrackStreamOutcome, TrackThumbnailOutcome } from './types.js';
import type { TrackStreamResult, TrackThumbnailResult } from './types.js';

function loadTrack(
  database: DatabaseHandle,
  trackId: string
): TrackRow | undefined {
  return database.db.select().from(tracks).where(eq(tracks.id, trackId)).get();
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
