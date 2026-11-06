/* A removed track takes the removed tone whatever its file status; that
 * precedence is why this mapping is shared rather than written per client. */
import { TrackFileStatus, TrackSourceStatus } from '@playliberty/contracts';

import { TrackTone } from '../types.js';

const FILE_STATUS_TONES: Readonly<Record<TrackFileStatus, TrackTone>> = {
  [TrackFileStatus.Pending]: TrackTone.Pending,
  [TrackFileStatus.Downloading]: TrackTone.Downloading,
  [TrackFileStatus.Stored]: TrackTone.Stored,
  [TrackFileStatus.Failed]: TrackTone.Failed,
  [TrackFileStatus.Unavailable]: TrackTone.Unavailable
};

/* The tone of the source fact: a removed source is the news whatever the file
 * says. The file's own tone is `fileTone`. */
export function trackTone(
  fileStatus: TrackFileStatus,
  sourceStatus: TrackSourceStatus
): TrackTone {
  if (sourceStatus === TrackSourceStatus.Removed) {
    return TrackTone.Removed;
  }

  return FILE_STATUS_TONES[fileStatus];
}

/* The tone of the file fact. A stored track whose source was removed is
 * retained, the one combination the file status alone cannot name. */
export function fileTone(
  fileStatus: TrackFileStatus,
  sourceStatus: TrackSourceStatus
): TrackTone {
  if (
    fileStatus === TrackFileStatus.Stored &&
    sourceStatus === TrackSourceStatus.Removed
  ) {
    return TrackTone.Retained;
  }

  return FILE_STATUS_TONES[fileStatus];
}
