import {
  IconDotsVertical,
  IconRotate,
  IconScissorsOff,
  IconTrash
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { memo, useEffect, useRef, useState } from 'react';

import type { PlaylistTrack } from '@playliberty/contracts';
import { TrackFileStatus } from '@playliberty/contracts';
import { formatDuration, trackStateLabel, useI18n } from '@playliberty/i18n';
import { trackTone } from '@playliberty/ui-foundation';

import { API_PREFIX } from '../../api/client/client';
import TrackBars from '../TrackBars';
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
 * The lane is one overflow menu, and the row's rule is what it holds. A track the
 * caller can curate gets the menu; a track it cannot gets an inert lane, because a
 * control that cannot be pressed is worse than no control. The menu is the row's
 * actions in one door rather than several: for a failed fileless track it offers
 * Retry, Fetch whole and Remove, and for every other track it offers Remove
 * alone. Fetch whole is the bypass from
 * `10-skip-non-music-parts/05-fetch-one-fileless-track-whole`: it re-fetches the
 * one fileless track without trimming, so it is offered only where the route
 * accepts it, which is a failed track.
 *
 * Two rules from the design record hold here and not one more:
 *
 *   Stored says nothing. The default state draws no word, because a row with
 *   nothing wrong should not announce that it is fine. The one exception is the
 *   policy: a track recorded as full length carries the word, because a
 *   full-length track when a trimmed one was expected must read as deliberate.
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
  /**
   * Re-fetch a failed fileless track whole, without trimming. Absent when the
   * caller cannot act on the track.
   */
  readonly onFetchWhole?: (trackId: string) => void;
  /** Remove the track from the playlist. Absent when the caller cannot curate. */
  readonly onRemove?: (trackId: string) => void;
  /** Whether a row action is in flight, so the menu is not opened onto a no-op. */
  readonly busy?: boolean;
  readonly pending?: boolean;
}

interface LaneItem {
  readonly label: string;
  readonly icon: ReactNode;
  readonly destructive?: boolean;
  readonly run: () => void;
}

function TrackRow({
  association,
  current,
  playing,
  onPlay,
  onRetry,
  onFetchWhole,
  onRemove,
  busy = false,
  pending = false
}: TrackRowProps) {
  const { t } = useI18n();
  const { track } = association;
  const stateLabel = trackStateLabel(
    t,
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
    current && playing
      ? t('trackRow.pause', { title: track.title })
      : t('trackRow.play', { title: track.title });
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
   * The lane's one control, and the row's rule is what its menu holds. A failed
   * fileless track the caller can act on gets Retry and Fetch whole beside the
   * remove; every other curatable row gets the remove alone. A row with nothing
   * to do keeps a reserved, inert lane so the duration column never moves. A
   * downloading row keeps the menu but disables it: the download owns the track
   * while it runs, and a remove or retry would race it.
   */
  const laneItems: LaneItem[] = [
    ...(failed && onRetry !== undefined
      ? [
          {
            label: t('trackRow.retry'),
            icon: (
              <IconRotate
                className={styles.trackRow__menuIcon}
                aria-hidden="true"
                focusable="false"
              />
            ),
            run: () => onRetry(track.id)
          }
        ]
      : []),
    ...(failed && onFetchWhole !== undefined
      ? [
          {
            label: t('trackRow.fetchWhole'),
            icon: (
              <IconScissorsOff
                className={styles.trackRow__menuIcon}
                aria-hidden="true"
                focusable="false"
              />
            ),
            run: () => onFetchWhole(track.id)
          }
        ]
      : []),
    ...(onRemove === undefined
      ? []
      : [
          {
            label: t('trackRow.remove'),
            icon: (
              <IconTrash
                className={styles.trackRow__menuIcon}
                aria-hidden="true"
                focusable="false"
              />
            ),
            destructive: true,
            run: () => onRemove(track.id)
          }
        ])
  ];

  const lane =
    laneItems.length === 0 ? (
      <span className={styles.trackRow__lane} aria-hidden="true" />
    ) : (
      <span className={styles.trackRow__menuAnchor} ref={menuAnchorRef}>
        <button
          type="button"
          className={styles.trackRow__action}
          aria-label={t('trackRow.actions', { title: track.title })}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={downloading || busy || pending}
          onClick={() => setMenuOpen(open => !open)}>
          <IconDotsVertical
            className={styles.trackRow__actionIcon}
            aria-hidden="true"
            focusable="false"
          />
        </button>
        {menuOpen ? (
          <div className={styles.trackRow__menu} role="menu">
            {laneItems.map(item => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={styles.trackRow__menuItem}
                data-destructive={item.destructive ? 'true' : undefined}
                onClick={() => {
                  setMenuOpen(false);
                  item.run();
                }}>
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </span>
    );

  return (
    <li
      className={styles.trackRow}
      data-state={current ? (playing ? 'playing' : 'paused') : undefined}
      data-playable={playable ? 'true' : undefined}
      data-downloading={downloading ? 'true' : undefined}
      data-pending={pending ? 'true' : undefined}
      aria-busy={pending ? true : undefined}>
      <span
        className={styles.trackRow__art}
        data-art={artwork === null ? 'no-art' : 'art'}>
        {artwork === null ? null : (
          <img
            className={styles.trackRow__image}
            src={artwork}
            alt=""
            loading="lazy"
            decoding="async"
          />
        )}
        {current ? (
          <span className={styles.trackRow__scrim} aria-hidden="true" />
        ) : null}
        {current ? (
          <TrackBars
            className={styles.trackRow__bars}
            barClassName={styles.trackRow__bar}
            playing={playing}
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
          {/* The recorded policy, and only when it is the non-default one: a
           * track fetched whole reads as deliberate rather than as a trim that
           * silently failed. The default, trimmed, says nothing. */}
          {track.skipNonMusic ? null : (
            <span className={styles.trackRow__policy}>
              {t('trackRow.fullLength')}
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
          disabled={pending}
          onClick={() => onPlay(track.id)}
        />
      ) : null}
    </li>
  );
}

/*
 * Memoized so a parent render skips a row whose own props did not change. The
 * detail page holds the callbacks it passes stable, which is what makes the
 * comparison meaningful: without both halves a queue change re-renders every
 * row, which is the long-list cost this guards.
 */
export default memo(TrackRow);
