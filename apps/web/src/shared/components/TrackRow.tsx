import { IconDotsVertical, IconRotate, IconTrash } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

import { TrackFileStatus } from '@playliberty/contracts';
import type { PlaylistTrack } from '@playliberty/contracts';
import {
  formatDuration,
  trackStateLabel,
  trackTone
} from '@playliberty/ui-foundation';

import { API_PREFIX } from '../api/client';
import TrackBars from './TrackBars';
import styles from './TrackRow.module.scss';

/*
 * One track in the playlist detail's list, which is the queue's surface. The row
 * is the design system's core unit: the artwork, the title, the source and state
 * line, the duration, and the action lane.
 *
 * The row's body is a hit layer that plays the track, and toggles back to pause
 * when it is already the row playing. The lane at the end is the row's own
 * control and sits above that layer, so a press on it opens the menu rather than
 * starting the track. A track with no stored file has no play layer, but its lane
 * is still there: a failed download has something to be done about.
 *
 * The lane is one control in two shapes, by the row's own rule. A failed track
 * gets a retry, because that is the one state the listener can act on right now;
 * every other row gets the overflow. The two are never both drawn: the action is
 * the row's answer, and a menu beside it would be a second door onto the same
 * question.
 *
 * Two rules from the design record hold here and not one more:
 *
 *   Stored says nothing. The default state draws no word, because a row with
 *   nothing wrong should not announce that it is fine.
 *
 *   A state is never carried by colour alone. Every other state has a word, and
 *   a failed or unavailable row also carries the server's own reason.
 */

interface TrackRowProps {
  readonly association: PlaylistTrack;
  /** Whether this row is the queue's current track. */
  readonly current: boolean;
  /** Whether the queue is actually playing, which decides play against pause. */
  readonly playing: boolean;
  readonly onPlay: (trackId: string) => void;
  /** Retry a failed download. Absent when the caller cannot act on the track. */
  readonly onRetry?: (trackId: string) => void;
  /** Remove the track from the playlist. Absent when the caller cannot curate. */
  readonly onRemove?: (trackId: string) => void;
  /** Whether a retry is in flight, so the control is not pressed twice. */
  readonly retrying?: boolean;
}

export default function TrackRow({
  association,
  current,
  playing,
  onPlay,
  onRetry,
  onRemove,
  retrying = false
}: TrackRowProps) {
  const { track } = association;
  const stateLabel = trackStateLabel(
    track.fileStatus,
    track.sourceStatus,
    track.provider
  );
  const tone = trackTone(track.fileStatus, track.sourceStatus);
  const playable = track.fileStatus === TrackFileStatus.Stored;
  const failed = track.fileStatus === TrackFileStatus.Failed;
  const downloading = track.fileStatus === TrackFileStatus.Downloading;
  const artwork =
    track.thumbnailPath === null
      ? null
      : `${API_PREFIX}/tracks/${track.id}/thumbnail`;
  const label =
    current && playing ? `Pause ${track.title}` : `Play ${track.title}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLSpanElement>(null);

  /*
   * The menu closes on a press outside it and on Escape, which is the whole
   * behaviour of an overflow that opens onto a small set of items. A press inside
   * is left alone so an item's own handler can run.
   */
  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent): void => {
      if (!menuAnchorRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  /*
   * The lane's one control. A failed row offers the retry only when the caller
   * can act; otherwise it falls back to the menu, which is the row's other
   * question. A row with nothing to do keeps a reserved, inert lane so the
   * duration column never moves. A downloading row keeps the menu but disables
   * it: the download owns the track while it runs, and a remove or retry would
   * race it.
   */
  const lane = (() => {
    if (failed && onRetry !== undefined) {
      return (
        <button
          type="button"
          className={styles.trackRow__action}
          data-action="retry"
          aria-label={`Retry ${track.title}`}
          disabled={retrying}
          onClick={() => onRetry(track.id)}>
          <IconRotate
            className={styles.trackRow__actionIcon}
            aria-hidden="true"
            focusable="false"
          />
        </button>
      );
    }

    if (onRemove === undefined) {
      return <span className={styles.trackRow__lane} aria-hidden="true" />;
    }

    return (
      <span className={styles.trackRow__menuAnchor} ref={menuAnchorRef}>
        <button
          type="button"
          className={styles.trackRow__action}
          aria-label={`Actions for ${track.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={downloading}
          onClick={() => setMenuOpen(open => !open)}>
          <IconDotsVertical
            className={styles.trackRow__actionIcon}
            aria-hidden="true"
            focusable="false"
          />
        </button>
        {menuOpen ? (
          <div className={styles.trackRow__menu} role="menu">
            <button
              type="button"
              role="menuitem"
              className={styles.trackRow__menuItem}
              data-destructive="true"
              onClick={() => {
                setMenuOpen(false);
                onRemove(track.id);
              }}>
              <IconTrash
                className={styles.trackRow__menuIcon}
                aria-hidden="true"
                focusable="false"
              />
              Remove from playlist
            </button>
          </div>
        ) : null}
      </span>
    );
  })();

  return (
    <li
      className={styles.trackRow}
      data-state={current ? (playing ? 'playing' : 'paused') : undefined}
      data-playable={playable ? 'true' : undefined}
      data-downloading={downloading ? 'true' : undefined}>
      <span
        className={styles.trackRow__art}
        data-art={artwork === null ? 'no-art' : 'art'}>
        {artwork === null ? null : (
          <img className={styles.trackRow__image} src={artwork} alt="" />
        )}
        {current ? (
          <span className={styles.trackRow__scrim} aria-hidden="true" />
        ) : null}
        {current ? (
          <TrackBars
            className={styles.trackRow__bars}
            barClassName={styles.trackRow__bar}
          />
        ) : null}
      </span>
      <div className={styles.trackRow__body}>
        <span className={styles.trackRow__title}>{track.title}</span>
        <span className={styles.trackRow__sub}>
          {stateLabel === null ? null : (
            <span className={styles.trackRow__state} data-tone={tone}>
              {stateLabel}
            </span>
          )}
          {/* The server's own reason, kept as secondary copy: the mapped word is
           * primary, and the sentence is bounded to one ellipsized line with the
           * full text in `title`, so an untrusted, unbounded string cannot set
           * the row's geometry or overflow toward the duration column. */}
          {track.failureReason === null ? null : (
            <span
              className={styles.trackRow__reason}
              title={track.failureReason}>
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
      <span className={styles.trackRow__laneSlot}>{lane}</span>
      {playable ? (
        <button
          type="button"
          className={styles.trackRow__hit}
          aria-label={label}
          onClick={() => onPlay(track.id)}
        />
      ) : null}
    </li>
  );
}
