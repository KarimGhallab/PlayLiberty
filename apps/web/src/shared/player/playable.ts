import type { Track } from '@playliberty/contracts';
import { TrackFileStatus } from '@playliberty/contracts';

/*
 * The one playable rule. A row reads a track; an aggregate reads the counts the
 * same read already carries. Both answers come from here, so a control cannot
 * offer a play the queue build would refuse.
 */

/* Whether one track can enter a queue: only a stored file plays. */
export function isPlayable(track: Pick<Track, 'fileStatus'>): boolean {
  return track.fileStatus === TrackFileStatus.Stored;
}

/* Whether a playlist has anything to play, from its whole-playlist counts. */
export function hasPlayableTrack(playlist: {
  readonly counts: Readonly<Record<TrackFileStatus, number>>;
}): boolean {
  return playlist.counts[TrackFileStatus.Stored] > 0;
}
