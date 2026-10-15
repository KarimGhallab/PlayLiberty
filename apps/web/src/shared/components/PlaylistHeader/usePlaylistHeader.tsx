import {
  IconAlertTriangle,
  IconArrowsShuffle,
  IconDots,
  IconLock,
  IconLockShare,
  IconPlayerSkipBack,
  IconPlayerTrackNext,
  IconUserShare
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { Fragment, useEffect, useRef, useState } from 'react';

import type { Playlist } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import {
  formatLastSynced,
  syncStateLabel,
  trackCountUnit,
  useI18n
} from '@playliberty/i18n';
import { sleeveIndex } from '@playliberty/ui-foundation';

import { API_PREFIX } from '../../api/client/client';
import type { PlaylistAction } from '../../playlistActions/playlistActions';
import PlayGlyph from '../PlayGlyph';
import { useDismissibleMenu } from '../useDismissibleMenu/useDismissibleMenu';
import { usePlayPauseMorph } from '../usePlayPauseMorph/usePlayPauseMorph';
import styles from './PlaylistHeader.module.scss';

/*
 * The playlist header's shared seam: what the row and the card both draw, built
 * once. The cover's state, the identity block and the menu model live here, and
 * each arrangement composes them into its own markup, so the two cannot drift
 * on the name, the share mark, the count, the sync line or the overflow.
 *
 * The actions column is the play, the transport that replaces it while the queue
 * is this playlist, the shuffle and the overflow, each absent when the caller
 * offers no callback: the header is gated by what the caller can do rather than
 * by a level string it would have to learn. The overflow's items are not the
 * header's to decide: the actions module builds them by access and hands them in
 * as `menu`, so an owner gets the four it can act on, a writer the one it can, and
 * a reader an empty menu and no overflow.
 *
 * `ownerName` is the resolved display name of a playlist that is not the
 * account's, and null when the directory does not carry the owner. It is drawn
 * only for a shared playlist: on the account's own playlist `access` is `owner`,
 * which already says the item is theirs, so a "shared by" line there would be a
 * sentence about the person reading it. A null name draws nothing at all rather
 * than a placeholder, because a placeholder reads as a decision about who owns
 * the playlist, and the share indicator beside the name is the honest fallback.
 */

export interface PlaylistHeaderSeam {
  playlist: Playlist;
  ownerName?: string | null;
  /*
   * Whether the name is the page heading rather than a self-link. The detail's
   * header owns the route it names, so its name is a heading; the library's item
   * is a door and its name is the link beside the cover's own.
   */
  heading?: boolean;
  /*
   * Whether a deferred action is about to remove this playlist. It dims the
   * header, sets `aria-busy`, and disables every control and door it offers, so
   * the thing the toast says is going cannot still be opened, renamed, shuffled
   * or deleted again.
   */
  pending?: boolean;
  /* The one play door. Optional, so a consumer that cannot start playback
   * simply does not draw it. */
  onPlay?: () => void;
  playing?: boolean;
  /*
   * Whether this playlist is the one the queue is on, paused or playing. The
   * transport's steps act on the queue, so they stay whenever the header is the
   * queue's own and the caller offers both, and a playlist the queue is not on
   * keeps the single play that starts it.
   */
  current?: boolean;
  /* The transport's steps. The pair and `current` together decide whether the
   * transport replaces the standalone play; an absent pair keeps the standalone
   * play, so a consumer that cannot skip does not lose its door. */
  onSkipBack?: () => void;
  onSkipNext?: () => void;
  /*
   * Whether the queue has a track after the current one. The transport is drawn
   * while playing, and a last track's next has nowhere to go, so the control
   * disables rather than offering a press that does nothing.
   */
  hasNext?: boolean;
  onShuffle?: () => void;
  shuffled?: boolean;
  menu?: readonly PlaylistAction[];
  /* The cover as a blurred ground behind the header. */
  ground?: boolean;
  /* The elapsed sync time beside the state, which only the row asks for. */
  showSyncTime?: boolean;
  now?: Date;
  displayedCount?: number;
  /*
   * The total the count line describes. It is the playlist's own count when no
   * filter is on, and the filtered total when the detail has narrowed the list:
   * the line must not claim rows the filter removed.
   */
  countTotal?: number;
  playbackFailed?: boolean;
  playbackStarting?: boolean;
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
}

interface ShareMark {
  readonly state: 'own-private' | 'own-shared' | 'collab';
  readonly label: MessageKey<Messages>;
  readonly Icon: typeof IconLock;
}

/*
 * Three share states and one glyph each. The indicator is coarser than the
 * permission model on purpose: one glyph says you are not the owner and nothing
 * about what you may do, because the level is shown where it acts, in the
 * overflow.
 */
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
  menu = [],
  ground = false,
  showSyncTime = false,
  now = new Date(),
  displayedCount,
  countTotal,
  playbackFailed = false,
  playbackStarting = false,
  onRetryPlayback
}: PlaylistHeaderSeam): PlaylistHeaderParts {
  const { t } = useI18n();
  const mark = shareMark(playlist);
  const sharedBy =
    playlist.access !== 'owner' && ownerName !== null ? ownerName : null;
  /* The identity hue a no-artwork cover draws. Derived from the id, so it is the
   * same sleeve wherever this playlist appears and it survives a reload. */
  const sleeve = sleeveIndex(playlist.id);
  const coverSrc =
    playlist.coverTrackId === null
      ? null
      : `${API_PREFIX}/tracks/${playlist.coverTrackId}/thumbnail`;
  const [coverFailed, setCoverFailed] = useState(false);
  const cover = coverFailed ? null : coverSrc;

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
  const menuRef = useRef<HTMLDivElement>(null);
  /* Whether the next open should land on the last item (ArrowUp) or the first. */
  const menuFocusLastRef = useRef(false);
  const [shareTipDismissed, setShareTipDismissed] = useState(false);
  const { run, endRun } = usePlayPauseMorph(playing);

  /* The cover's failure flag resets when the playlist points at a new track. */
  useEffect(() => {
    setCoverFailed(false);
  }, [playlist.coverTrackId]);

  /*
   * The enabled items of the open panel, read from the DOM on each use rather
   * than captured: Sync stops while a run is in flight, so the wrap and the ends
   * must count only what can be pressed now.
   */
  const enabledMenuItems = (): HTMLButtonElement[] => {
    const menu = menuRef.current;

    if (menu === null) {
      return [];
    }

    return Array.from(
      menu.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled])'
      )
    );
  };

  const focusMenuItem = (index: number): void => {
    const items = enabledMenuItems();

    if (items.length === 0) {
      return;
    }

    const wrapped = ((index % items.length) + items.length) % items.length;
    items[wrapped]?.focus();
  };

  const closeMenu = (): void => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  useDismissibleMenu({
    open: menuOpen,
    containerRef: menuAnchorRef,
    onClose: () => setMenuOpen(false),
    returnFocusTo: menuButtonRef
  });

  /*
   * Opening moves focus onto an item, which is where a menu button leaves it and
   * what `role="menu"` promises; ArrowUp on the button opens onto the last item
   * and every other way opens onto the first. The arrows, Home and End walk the
   * panel and Tab leaves it. The handler is on the panel, so it answers only keys
   * that arrive while the menu owns focus.
   */
  useEffect(() => {
    if (menuOpen) {
      focusMenuItem(
        menuFocusLastRef.current ? enabledMenuItems().length - 1 : 0
      );
    }
  }, [menuOpen]);

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const items = enabledMenuItems();
    const activeIndex = items.findIndex(
      item => item === document.activeElement
    );

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusMenuItem(activeIndex + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusMenuItem(activeIndex - 1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusMenuItem(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusMenuItem(items.length - 1);
      return;
    }

    /* Tab closes the panel and lets the browser walk on from the button focus is
     * returned to, which is the menu button's own tab stop. */
    if (event.key === 'Tab') {
      closeMenu();
    }
  };

  const playable = playlist.trackCount > 0;
  const total = countTotal ?? playlist.trackCount;
  const shownCount = displayedCount ?? total;
  const partial = shownCount < total;
  const lastSyncedAt =
    playlist.lastSyncedAt === null ? null : new Date(playlist.lastSyncedAt);

  /* The one door. It is a pause while the queue is this playlist, which is the
   * header's own swap, and it is disabled rather than absent on a playlist with
   * nothing to play: a control that is there and cannot be pressed is a
   * different thing from a control that is not there. */
  const playControl =
    onPlay === undefined ? null : (
      <button
        type="button"
        className={styles.playlistHeader__play}
        aria-label={playing ? t('header.pause') : t('header.play')}
        disabled={!playable || pending || playbackStarting}
        data-run={run}
        onAnimationEnd={endRun}
        onClick={onPlay}>
        <PlayGlyph
          className={styles.playlistHeader__glyph}
          stripClassName={styles.playlistHeader__strip}
        />
      </button>
    );

  /* The transport is the queue's own control, so it is drawn while this card is
   * the queue, paused or playing, and it needs both steps and the play to be one
   * control. A playlist the queue is not on has nowhere to step, so it keeps the
   * single play. */
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
        disabled={playbackStarting}
        onClick={onRetryPlayback}>
        <IconAlertTriangle
          className={styles.playlistHeader__retryIcon}
          aria-hidden="true"
          focusable="false"
        />
        {playbackStarting
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
        disabled={pending || playbackStarting}
        onClick={onShuffle}>
        <IconArrowsShuffle
          className={styles.playlistHeader__icon}
          aria-hidden="true"
          focusable="false"
        />
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
          onClick={() => {
            menuFocusLastRef.current = false;
            setMenuOpen(open => !open);
          }}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              menuFocusLastRef.current = event.key === 'ArrowUp';
              setMenuOpen(true);
            }
          }}>
          <IconDots
            className={styles.playlistHeader__icon}
            aria-hidden="true"
            focusable="false"
          />
        </button>
        {menuOpen ? (
          <div
            className={styles.playlistHeader__menu}
            role="menu"
            ref={menuRef}
            onKeyDown={onMenuKeyDown}>
            {menu.map((item, index) => (
              <Fragment key={item.key}>
                {item.destructive === true && index > 0 ? <hr /> : null}
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={styles.playlistHeader__menuItem}
                  data-destructive={
                    item.destructive === true ? 'true' : undefined
                  }
                  disabled={item.disabled === true}
                  onClick={() => {
                    closeMenu();
                    item.onSelect();
                  }}>
                  <item.Icon
                    className={styles.playlistHeader__menuIcon}
                    aria-hidden="true"
                    focusable="false"
                  />
                  {t(item.label)}
                </button>
              </Fragment>
            ))}
          </div>
        ) : null}
      </span>
    );

  const identity = (
    <>
      <div className={styles.playlistHeader__name}>
        {/* The line truncates to fit its column, so the full name rides in
         * `title`: a name cut by the gallery's own width must still be
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
            aria-disabled={pending ? true : undefined}
            tabIndex={pending ? -1 : undefined}
            onClick={pending ? event => event.preventDefault() : undefined}>
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
      <div className={styles.playlistHeader__meta}>
        <span
          className={styles.playlistHeader__state}
          data-state={playlist.syncStatus}>
          {syncStateLabel(t, playlist.syncStatus)}
        </span>
        {showSyncTime ? (
          <>
            <span className={styles.playlistHeader__sep} aria-hidden="true">
              &middot;
            </span>
            <span className={styles.playlistHeader__time}>
              {formatLastSynced(t, lastSyncedAt, now)}
            </span>
          </>
        ) : null}
      </div>
      <div className={styles.playlistHeader__count}>
        {partial ? (
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
        )}
      </div>
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
    onCoverError: () => setCoverFailed(true),
    ground: groundElement,
    primaryControl,
    shuffleControl,
    menuControl,
    identity
  };
}
