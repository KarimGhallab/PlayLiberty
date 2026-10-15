/*
 * A removed track takes the removed tone whatever its file status is, because
 * the source is gone and the file should not compete with that news. The
 * precedence is the whole reason this mapping is shared rather than written
 * twice, once per client.
 */
import { TrackFileStatus, TrackSourceStatus } from '@playliberty/contracts';

import { TrackTone } from '../types.js';

const FILE_STATUS_TONES: Readonly<Record<TrackFileStatus, TrackTone>> = {
  [TrackFileStatus.Pending]: TrackTone.Pending,
  [TrackFileStatus.Downloading]: TrackTone.Downloading,
  [TrackFileStatus.Stored]: TrackTone.Stored,
  [TrackFileStatus.Failed]: TrackTone.Failed,
  [TrackFileStatus.Unavailable]: TrackTone.Unavailable
};

export function trackTone(
  fileStatus: TrackFileStatus,
  sourceStatus: TrackSourceStatus
): TrackTone {
  if (sourceStatus === TrackSourceStatus.Removed) {
    return TrackTone.Removed;
  }

  return FILE_STATUS_TONES[fileStatus];
}
