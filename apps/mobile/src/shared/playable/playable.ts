import type { Track } from '@playliberty/contracts';
import { TrackFileStatus } from '@playliberty/contracts';

/* The one playable rule: only a stored file plays. */
export function isPlayable(track: Pick<Track, 'fileStatus'>): boolean {
  return track.fileStatus === TrackFileStatus.Stored;
}
