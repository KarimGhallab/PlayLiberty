import {
  IconAlertTriangle,
  IconArrowsShuffle,
  IconDots,
  IconLock,
  IconLockShare,
  IconPlayerSkipBack,
  IconPlayerTrackNext,
  IconRotate,
  IconUserShare
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { Playlist } from '@playliberty/contracts';
import { PlaylistSyncStatus, endpoints } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import {
  formatLastSynced,
  syncStateLabel,
  trackCountUnit,
  useI18n
} from '@playliberty/i18n';
import { sleeveIndex } from '@playliberty/ui-foundation';

import { mediaUrl } from '../../api/endpoints/endpoints';
import type { PlaylistAction } from '../../playlistActions/playlistActions';
import Menu from '../Menu/Menu';
import PlayGlyph from '../PlayGlyph';
import Spinner from '../Spinner/Spinner';
import { useDismissibleMenu } from '../useDismissibleMenu/useDismissibleMenu';
import { usePlayPauseMorph } from '../usePlayPauseMorph/usePlayPauseMorph';
import styles from './PlaylistHeader.module.scss';
import type { PlaylistDoorProps } from './playlistDoor';
import { playlistDoorProps } from './playlistDoor';

/*
 * The header's shared seam: the cover state, the identity block and the menu
 * model, built once so the arrangements cannot drift. Each control is drawn
 * only when the caller offers its callback.
 */

/* Which start control a press belongs to, so only it shows the in-flight
 * state while the others wait. */
export type PlaybackStartControl = 'play' | 'shuffle';

enum CoverFailure {
  None = 'none',
  Custom = 'custom',
  Track = 'track'
}

/* The custom image carries its version, so a replacement is a new cache key. */
function customCoverUrl(playlist: Playlist): string | null {
  if (playlist.coverUpdatedAt === null) {
    return null;
  }

  const path = mediaUrl(endpoints.playlistCover, { playlistId: playlist.id });

  return `${path}?v=${encodeURIComponent(playlist.coverUpdatedAt)}`;
}

export interface PlaylistHeaderSeam {
  playlist: Playlist;
  ownerName?: string | null;
  /* Whether the name is the page heading rather than a self-link. The detail's
   * header owns the route it names. */
  heading?: boolean;
  /* Whether a deferred action is about to remove this playlist: it dims the
   * header and disables every control and door it offers. */
  pending?: boolean;
  /* The play door; absent when the caller cannot start playback. */
  onPlay?: () => void;
  playing?: boolean;
  /* Whether this playlist is the one the queue is on, paused or playing. */
  current?: boolean;
  /* The transport's steps; absent keeps the standalone play, so a consumer that
   * cannot skip does not lose its door. */
  onSkipBack?: () => void;
  onSkipNext?: () => void;
  /* Whether the queue has a track after the current one: the last track's next
   * disables. */
  hasNext?: boolean;
  onShuffle?: () => void;
  shuffled?: boolean;
  /* The named sync beside the state; absent for a reader. Only the detail's
   * stacked identity draws it, where the state has a line of its own. */
  onSync?: () => void;
  /* Whether a sync is in flight: the control carries the word. */
  syncing?: boolean;
  menu?: readonly PlaylistAction[];
  /* The cover as a blurred ground behind the header. */
  ground?: boolean;
  /* The elapsed sync time beside the state. */
  showSyncTime?: boolean;
  now?: Date;
  /* The library's own mark, which the card item draws beside the count. */
  mark?: ReactNode;
  /* Whether the count and the sync state share one line: count left, state
   * right. */
  statusLine?: boolean;
  /* The rows the caller's list has loaded, when that list is the whole
   * playlist: a narrowed list owes no window claim against this count. */
  displayedCount?: number;
  /* Whether this playlist has anything to play. Required: the seam cannot
   * derive it from `trackCount`, which counts every association. */
  playable: boolean;
  /* Whether the play names its playlist: true where several cards stand
   * together, false where the page heading already names it. */
  namedPlay?: boolean;
  playbackFailed?: boolean;
  /* Whether this header's play or shuffle is the press waiting on its read. */
  playbackStarting?: boolean;
  /* Whether any start for this playlist is waiting: every start control waits. */
  playbackBusy?: boolean;
  /* Which start control the in-flight press belongs to. */
  startingControl?: PlaybackStartControl;
  onRetryPlayback?: () => void;
}

export interface PlaylistHeaderParts {
  /* The sleeve index a no-artwork cover draws, derived from the id. */
  readonly sleeve: number;
  /* The cover's source, or null once it has failed or the playlist has none. */
  readonly cover: string | null;
  /* The cover's fallback to the sleeve, for the arrangement's own `img`. */
  readonly onCoverError: () => void;
  readonly ground: ReactNode;
  readonly primaryControl: ReactNode;
  readonly shuffleControl: ReactNode;
  readonly menuControl: ReactNode;
  readonly identity: ReactNode;
  /* The door props every arrangement spreads on the anchor it places. */
  readonly door: PlaylistDoorProps;
}

interface ShareMark {
  readonly state: 'own-private' | 'own-shared' | 'collab';
  readonly label: MessageKey<Messages>;
  readonly Icon: typeof IconLock;
}

/* The indicator is deliberately coarser than the permission model: one glyph
 * says you are not the owner, not what you may do. */
function shareMark(playlist: Playlist): ShareMark {
  if (playlist.access !== 'owner') {
    return {
      state: 'collab',
      label: 'header.collab',
      Icon: IconUserShare
    };
  }

  if (playlist.hasShares) {
    return {
      state: 'own-shared',
      label: 'header.shared',
      Icon: IconLockShare
    };
  }

  return { state: 'own-private', label: 'header.private', Icon: IconLock };
}

export function usePlaylistHeader({
  playlist,
  ownerName = null,
  heading = false,
  pending = false,
  onPlay,
  playing = false,
  current = false,
  onSkipBack,
  onSkipNext,
  hasNext = true,
  onShuffle,
  shuffled = false,
  onSync,
  syncing = false,
  menu = [],
  ground = false,
  showSyncTime = false,
  now = new Date(),
  statusLine = false,
  mark: nameMark,
  displayedCount,
  playable,
  namedPlay = false,
  playbackFailed = false,
  playbackStarting = false,
  playbackBusy = playbackStarting,
  startingControl = 'play',
  onRetryPlayback
}: PlaylistHeaderSeam): PlaylistHeaderParts {
  const { t } = useI18n();
  const mark = shareMark(playlist);
  const sharedBy =
    playlist.access !== 'owner' && ownerName !== null ? ownerName : null;
  /* The identity hue a no-artwork cover draws. Derived from the id, so it is the
   * same sleeve wherever this playlist appears and it survives a reload. */
  const sleeve = sleeveIndex(playlist.id);
  const customCoverSrc = customCoverUrl(playlist);
  const trackCoverSrc =
    playlist.coverTrackId === null
      ? null
      : mediaUrl(endpoints.trackThumbnail, { trackId: playlist.coverTrackId });
  const [coverFailure, setCoverFailure] = useState(CoverFailure.None);
  const showingCustom =
    customCoverSrc !== null && coverFailure === CoverFailure.None;
  const cover = showingCustom
    ? customCoverSrc
    : coverFailure === CoverFailure.Track
      ? null
      : trackCoverSrc;

  /* The image has no source to name, so the failure state names which level
   * failed: the custom image first, then the track thumbnail, then the sleeve. */
  const onCoverError = () =>
    setCoverFailure(showingCustom ? CoverFailure.Custom : CoverFailure.Track);

  const groundElement = ground ? (
    <span
      className={styles.playlistHeader__ground}
      aria-hidden="true"
      data-ground={cover === null ? 'sleeve' : 'art'}
      data-sleeve={cover === null ? sleeve : undefined}
      style={
        cover === null ? undefined : { backgroundImage: `url("${cover}")` }
      }
    />
  ) : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLSpanElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [shareTipDismissed, setShareTipDismissed] = useState(false);
  const { run, endRun } = usePlayPauseMorph(playing);

  useEffect(() => {
    setCoverFailure(CoverFailure.None);
  }, [playlist.coverUpdatedAt, playlist.coverTrackId]);

  const door = playlistDoorProps(pending);

  useDismissibleMenu({
    open: menuOpen,
    containerRef: menuAnchorRef,
    triggerRef: menuButtonRef,
    onOpen: () => setMenuOpen(true),
    onClose: () => setMenuOpen(false)
  });

  /* The playlist's own size, never a narrowed read's: a filter changes what is
   * drawn, not how large the playlist is. */
  const total = playlist.trackCount;
  const shownCount = displayedCount ?? total;
  const partial = shownCount < total;
  const lastSyncedAt =
    playlist.lastSyncedAt === null ? null : new Date(playlist.lastSyncedAt);

  /* Disabled rather than absent on a playlist with nothing to play: a control
   * that cannot be pressed differs from one that is not there. */
  const startingPlay = playbackStarting && startingControl === 'play';
  const startingShuffle = playbackStarting && startingControl === 'shuffle';
  const playLabel = namedPlay
    ? t(playing ? 'header.pauseNamed' : 'header.playNamed', {
        name: playlist.name
      })
    : t(playing ? 'header.pause' : 'header.play');

  const playControl =
    onPlay === undefined ? null : (
      <button
        type="button"
        className={styles.playlistHeader__play}
        aria-label={playLabel}
        aria-busy={startingPlay ? true : undefined}
        data-starting={startingPlay ? 'true' : undefined}
        disabled={!playable || pending || playbackBusy}
        data-run={run}
        onAnimationEnd={endRun}
        onClick={onPlay}>
        {startingPlay ? (
          <Spinner />
        ) : (
          <PlayGlyph
            className={styles.playlistHeader__glyph}
            stripClassName={styles.playlistHeader__strip}
          />
        )}
      </button>
    );

  /* Drawn while this card is the queue, paused or playing, with both steps: a
   * playlist the queue is not on keeps the single play. */
  const showTransport =
    current &&
    onPlay !== undefined &&
    onSkipBack !== undefined &&
    onSkipNext !== undefined;

  const transportOrPlay = showTransport ? (
    <div className={styles.playlistHeader__transport}>
      <button
        type="button"
        className={styles.playlistHeader__step}
        aria-label={t('header.skipBack')}
        onClick={onSkipBack}>
        <IconPlayerSkipBack
          className={styles.playlistHeader__stepIcon}
          aria-hidden="true"
          focusable="false"
        />
      </button>
      {playControl}
      <button
        type="button"
        className={styles.playlistHeader__step}
        aria-label={t('header.trackNext')}
        disabled={!hasNext}
        onClick={onSkipNext}>
        <IconPlayerTrackNext
          className={styles.playlistHeader__stepIcon}
          aria-hidden="true"
          focusable="false"
        />
      </button>
    </div>
  ) : (
    playControl
  );

  const retryControl =
    onRetryPlayback === undefined ? null : (
      <button
        type="button"
        className={styles.playlistHeader__retry}
        aria-busy={playbackBusy ? true : undefined}
        disabled={playbackBusy}
        onClick={onRetryPlayback}>
        <IconAlertTriangle
          className={styles.playlistHeader__retryIcon}
          aria-hidden="true"
          focusable="false"
        />
        {playbackBusy
          ? t('header.retryingPlayback')
          : t('header.retryPlayback')}
      </button>
    );

  const failed = playbackFailed && retryControl !== null;

  const primaryControl = failed ? retryControl : transportOrPlay;

  const shuffleControl =
    failed || onShuffle === undefined ? null : (
      <button
        type="button"
        className={styles.playlistHeader__iconBtn}
        aria-pressed={shuffled && current}
        aria-label={t('header.shuffle', { name: playlist.name })}
        aria-busy={startingShuffle ? true : undefined}
        data-starting={startingShuffle ? 'true' : undefined}
        disabled={pending || playbackBusy}
        onClick={onShuffle}>
        {startingShuffle ? (
          <Spinner />
        ) : (
          <IconArrowsShuffle
            className={styles.playlistHeader__icon}
            aria-hidden="true"
            focusable="false"
          />
        )}
      </button>
    );

  /* The action owns the in-flight word beside a named sync control; a reader
   * keeps the state line, since no control can name it. */
  const actionOwnsSync = syncing && onSync !== undefined;

  const syncControl =
    onSync === undefined ? null : (
      <button
        type="button"
        className={styles.playlistHeader__sync}
        aria-busy={syncing ? true : undefined}
        disabled={pending || syncing}
        onClick={onSync}>
        {syncing ? (
          <Spinner />
        ) : (
          <IconRotate
            className={styles.playlistHeader__syncIcon}
            aria-hidden="true"
            focusable="false"
          />
        )}
        {syncing ? t('header.syncing') : t('header.syncNow')}
      </button>
    );

  const menuControl =
    menu.length === 0 ? null : (
      <span className={styles.playlistHeader__menuAnchor} ref={menuAnchorRef}>
        <button
          ref={menuButtonRef}
          type="button"
          className={styles.playlistHeader__iconBtn}
          aria-label={t('header.actions', { name: playlist.name })}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={pending}
          onClick={() => setMenuOpen(open => !open)}>
          <IconDots
            className={styles.playlistHeader__icon}
            aria-hidden="true"
            focusable="false"
          />
        </button>
        <Menu
          open={menuOpen}
          items={menu.map(item => ({
            key: item.key,
            label: t(item.label),
            icon: (
              <item.Icon
                className={styles.playlistHeader__menuIcon}
                aria-hidden="true"
                focusable="false"
              />
            ),
            destructive: item.destructive === true,
            disabled: item.disabled === true,
            onSelect: item.onSelect
          }))}
          triggerRef={menuButtonRef}
          onClose={() => setMenuOpen(false)}
          className={styles.playlistHeader__menu}
          itemClassName={styles.playlistHeader__menuItem}
          divided
        />
      </span>
    );

  const countLine = partial ? (
    <span>
      {t('header.countOf', {
        count: total,
        shown: shownCount,
        total
      })}
    </span>
  ) : (
    <>
      <span>{total}</span>
      <span className={styles.playlistHeader__countUnit}>
        {trackCountUnit(t, total)}
      </span>
    </>
  );

  const countNode = (
    <div className={styles.playlistHeader__count}>
      {countLine}
      {nameMark}
    </div>
  );

  /* The one state element; the status line holds it beside the count, the
   * stacked identity on its own line. A press that has not reached the server
   * yet already reads as syncing. */
  const syncState = syncing ? PlaylistSyncStatus.Syncing : playlist.syncStatus;
  const stateNode = actionOwnsSync ? null : (
    <span className={styles.playlistHeader__state} data-state={syncState}>
      {syncStateLabel(t, syncState)}
    </span>
  );

  const identity = (
    <>
      <div className={styles.playlistHeader__name}>
        {/* The line truncates, so the full name rides in `title` to stay
         * recoverable without opening the playlist. */}
        {heading ? (
          <h1 className={styles.playlistHeader__nameText} title={playlist.name}>
            {playlist.name}
          </h1>
        ) : (
          <Link
            to="/playlists/$playlistId"
            params={{ playlistId: playlist.id }}
            className={styles.playlistHeader__nameText}
            title={playlist.name}
            {...door}>
            {playlist.name}
          </Link>
        )}
        <span
          className={styles.playlistHeader__share}
          data-share={mark.state}
          data-tip-dismissed={shareTipDismissed ? 'true' : undefined}
          role="img"
          aria-label={t(mark.label)}
          tabIndex={0}
          onFocus={() => setShareTipDismissed(false)}
          onBlur={() => setShareTipDismissed(false)}
          onMouseEnter={() => setShareTipDismissed(false)}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              setShareTipDismissed(true);
            }
          }}>
          <mark.Icon
            className={styles.playlistHeader__shareIcon}
            aria-hidden="true"
            focusable="false"
          />
          <span className={styles.playlistHeader__shareTip} role="presentation">
            {t(mark.label)}
          </span>
        </span>
      </div>
      {statusLine ? (
        <div className={styles.playlistHeader__mstat}>
          {countNode}
          {stateNode}
        </div>
      ) : (
        <>
          <div className={styles.playlistHeader__meta}>
            {stateNode}
            {showSyncTime ? (
              <>
                {stateNode === null ? null : (
                  <span
                    className={styles.playlistHeader__sep}
                    aria-hidden="true">
                    &middot;
                  </span>
                )}
                <span className={styles.playlistHeader__time}>
                  {formatLastSynced(t, lastSyncedAt, now)}
                </span>
              </>
            ) : null}
            {syncControl}
          </div>
          {countNode}
        </>
      )}
      {sharedBy === null ? null : (
        <p className={styles.playlistHeader__owner}>
          {t('header.sharedBy', { name: sharedBy })}
        </p>
      )}
    </>
  );

  return {
    sleeve,
    cover,
    onCoverError,
    ground: groundElement,
    primaryControl,
    shuffleControl,
    menuControl,
    identity,
    door
  };
}
