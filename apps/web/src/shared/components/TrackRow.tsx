import { TrackFileStatus, TrackSourceStatus } from '@playliberty/contracts';
import type { PlaylistTrack } from '@playliberty/contracts';
import { formatDuration, trackStateLabel, trackTone } from '@playliberty/ui-foundation';

import { API_PREFIX } from '../api/client';

import PlayGlyph from './PlayGlyph';
import styles from './TrackRow.module.scss';

/*
 * One track in the playlist detail's list, which is the queue's surface. The row
 * is the design system's core unit: the artwork, the title, the source and state
 * line, the duration, and the play lane.
 *
 * Three rules from the design record hold here and not one more:
 *
 *   Stored says nothing. The default state draws no word, because a row with
 *   nothing wrong should not announce that it is fine.
 *
 *   A state is never carried by colour alone. Every other state has a word, and
 *   a failed or unavailable row also carries the server's own reason.
 *
 *   The play lane is reserved on every row, whether the control is drawn or not,
 *   so a duration never shifts sideways under the pointer.
 *
 * The control is present exactly when the file is stored and absent otherwise,
 * which is ticket 03's rule and is the same fact that decides whether a track
 * enters a queue. The design record's own reading was a disabled control on the
 * four unplayable states; absence is the product's decision, because a visible
 * control that cannot be pressed claims a track can be heard when it cannot, and
 * the lane being reserved means absence costs the layout nothing.
 */

interface TrackRowProps {
  readonly association: PlaylistTrack;
  /** Whether this row is the queue's current track. */
  readonly current: boolean;
  /** Whether the queue is actually playing, for the resting morph frame. */
  readonly playing: boolean;
  readonly onPlay: (trackId: string) => void;
}

export default function TrackRow({
  association,
  current,
  playing,
  onPlay
}: TrackRowProps) {
  const { track } = association;
  const stateLabel = trackStateLabel(track.fileStatus, track.sourceStatus);
  const tone = trackTone(track.fileStatus, track.sourceStatus);
  const playable = track.fileStatus === TrackFileStatus.Stored;
  const artwork =
    track.thumbnailPath === null
      ? null
      : `${API_PREFIX}/tracks/${track.id}/thumbnail`;

  return (
    <li
      className={styles.trackRow}
      data-state={current ? (playing ? 'playing' : 'paused') : undefined}
      data-removed={
        track.sourceStatus === TrackSourceStatus.Removed ? 'true' : undefined
      }>
      <span
        className={styles.trackRow__art}
        data-art={artwork === null ? 'no-art' : 'art'}>
        {artwork === null ? null : (
          <img className={styles.trackRow__image} src={artwork} alt="" />
        )}
      </span>
      <div className={styles.trackRow__body}>
        <span className={styles.trackRow__title}>{track.title}</span>
        <span className={styles.trackRow__sub}>
          {stateLabel === null ? null : (
            <span
              className={styles.trackRow__state}
              data-tone={tone}>
              {stateLabel}
            </span>
          )}
          {track.failureReason === null ? null : (
            <span className={styles.trackRow__reason}>
              {track.failureReason}
            </span>
          )}
        </span>
      </div>
      <span
        className={styles.trackRow__duration}
        data-none={track.durationSeconds === null ? 'true' : undefined}>
        {track.durationSeconds === null
          ? '--:--'
          : formatDuration(track.durationSeconds)}
      </span>
      <span className={styles.trackRow__lane}>
        {playable ? (
          <button
            type="button"
            className={styles.trackRow__play}
            aria-label={
              current && playing ? `Pause ${track.title}` : `Play ${track.title}`
            }
            onClick={() => onPlay(track.id)}>
            <PlayGlyph
              className={styles.trackRow__glyph}
              stripClassName={styles.trackRow__strip}
            />
          </button>
        ) : null}
      </span>
    </li>
  );
}
