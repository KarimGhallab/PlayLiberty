import {
  IconDotsVertical,
  IconRotate,
  IconScissorsOff,
  IconTrash
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { memo, useRef, useState } from 'react';

import type { PlaylistTrack } from '@playliberty/contracts';
import { TrackFileStatus, endpoints } from '@playliberty/contracts';
import { formatDuration, trackStateLabel, useI18n } from '@playliberty/i18n';
import { trackTone } from '@playliberty/ui-foundation';

import { mediaUrl } from '../../api/endpoints/endpoints';
import { failureSentence } from '../../api/problem/problem';
import { isPlayable } from '../../player/playable';
import Menu from '../Menu/Menu';
import Spinner from '../Spinner/Spinner';
import TrackBars from '../TrackBars';
import { useDismissibleMenu } from '../useDismissibleMenu/useDismissibleMenu';
import styles from './TrackRow.module.scss';

/*
 * The row's body is a hit layer that plays the track; the lane at its end sits
 * above it, so a press there opens the menu. A stored track draws no word, the
 * lane is inert without curate rights, and no state is carried by colour alone.
 */

interface TrackRowProps {
  readonly association: PlaylistTrack;
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
  /** Whether this row's press is waiting on its queue read. */
  readonly starting?: boolean;
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
  starting = false,
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
  const playable = isPlayable(track);
  const failed = track.fileStatus === TrackFileStatus.Failed;
  const downloading = track.fileStatus === TrackFileStatus.Downloading;
  /* A recorded thumbnail can outlive its file; a failed read falls to the hatch,
   * and the failed path scopes it so a new thumbnail gets its own attempt. */
  const [failedThumbnailPath, setFailedThumbnailPath] = useState<string | null>(
    null
  );
  const artwork =
    track.thumbnailPath === null || failedThumbnailPath === track.thumbnailPath
      ? null
      : mediaUrl(endpoints.trackThumbnail, { trackId: track.id });
  const label =
    current && playing
      ? t('trackRow.pause', { title: track.title })
      : t('trackRow.play', { title: track.title });
  const [menuOpen, setMenuOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const menuAnchorRef = useRef<HTMLSpanElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useDismissibleMenu({
    open: menuOpen,
    containerRef: menuAnchorRef,
    triggerRef: menuButtonRef,
    onOpen: () => setMenuOpen(true),
    onClose: () => setMenuOpen(false)
  });

  /* The lane's items: a failed fileless track gets Retry and Fetch whole beside
   * the remove; a downloading row keeps the menu but disables it. */
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
          ref={menuButtonRef}
          type="button"
          className={styles.trackRow__action}
          aria-label={t('trackRow.actions', { title: track.title })}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={downloading || busy || pending || starting}
          onClick={() => setMenuOpen(open => !open)}>
          <IconDotsVertical
            className={styles.trackRow__actionIcon}
            aria-hidden="true"
            focusable="false"
          />
        </button>
        {menuOpen ? (
          <Menu
            items={laneItems.map(item => ({
              key: item.label,
              label: item.label,
              icon: item.icon,
              destructive: item.destructive === true,
              onSelect: item.run
            }))}
            triggerRef={menuButtonRef}
            onClose={() => setMenuOpen(false)}
            className={styles.trackRow__menu}
            itemClassName={styles.trackRow__menuItem}
          />
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
      data-starting={starting ? 'true' : undefined}
      aria-busy={pending || starting ? true : undefined}>
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
            onError={() => setFailedThumbnailPath(track.thumbnailPath)}
          />
        )}
        {starting ? (
          <>
            <span className={styles.trackRow__scrim} aria-hidden="true" />
            <Spinner className={styles.trackRow__spinner} />
          </>
        ) : null}
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
          {/* The recorded policy, drawn only when it is the non-default one: a
           * track fetched whole must read as deliberate. */}
          {track.skipNonMusic ? null : (
            <span className={styles.trackRow__policy}>
              {t('trackRow.fullLength')}
            </span>
          )}
          {/* The mapped failure leads; the vendor's diagnostic waits behind the
           * disclosure, reachable by touch and keyboard. */}
          {track.failureReason === null ? null : (
            <>
              <span className={styles.trackRow__sentence}>
                {failureSentence(t, track.failureReason)}
              </span>
              <button
                type="button"
                className={styles.trackRow__reveal}
                aria-label={
                  revealed
                    ? t('trackRow.hideDetailsFor', { title: track.title })
                    : t('trackRow.showDetailsFor', { title: track.title })
                }
                aria-expanded={revealed}
                onClick={() => setRevealed(current => !current)}>
                {revealed
                  ? t('trackRow.hideDetails')
                  : t('trackRow.showDetails')}
              </button>
            </>
          )}
        </span>
        {revealed && track.failureReason !== null ? (
          <pre className={styles.trackRow__raw}>{track.failureReason}</pre>
        ) : null}
      </div>
      <span
        className={styles.trackRow__duration}
        data-none={track.durationSeconds === null ? 'true' : undefined}>
        {track.durationSeconds === null
          ? '--:--'
          : formatDuration(track.durationSeconds)}
      </span>
      {playable ? (
        <button
          type="button"
          className={styles.trackRow__hit}
          aria-label={label}
          aria-busy={starting ? true : undefined}
          disabled={pending || starting}
          onClick={() => onPlay(track.id)}
        />
      ) : null}
      <span className={styles.trackRow__laneSlot}>{lane}</span>
    </li>
  );
}

/*
 * Memoized so a parent render skips a row whose props did not change; the
 * detail page keeps its callbacks stable, which makes that meaningful.
 */
export default memo(TrackRow);
