import {
  IconArrowsShuffle,
  IconDots,
  IconLock,
  IconLockShare,
  IconPencil,
  IconPlayerSkipBack,
  IconPlayerTrackNext,
  IconRotate,
  IconShare,
  IconTrash,
  IconUserShare
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent
} from 'react';
import { Fragment, useEffect, useRef, useState } from 'react';

import type { Playlist } from '@playliberty/contracts';
import {
  formatLastSynced,
  sleeveIndex,
  syncStateLabel,
  trackCountUnit
} from '@playliberty/ui-foundation';

import PlayGlyph from './PlayGlyph';
import styles from './PlaylistHeader.module.scss';
import { usePlayPauseMorph } from './usePlayPauseMorph';

/*
 * The playlist header: the cover, the name, the share indicator, the count and
 * the sync line. It is the library's item and the playlist detail's header, one
 * component at two arrangements, so no screen draws a second item that resembles
 * it. It owns both arrangements and `arrangement` picks one: the row, the cover
 * beside the identity block, and the card, the cover above it. The library draws
 * the row on web; the playlist detail draws the card in its 320px left column.
 *
 * The actions column is a column: the play, then the shuffle and the overflow
 * beside each other under it. Every action is optional and its control is absent
 * when the callback is absent, so the header is gated by what the caller can do
 * rather than by a level string it would have to learn. The overflow is absent
 * for a read collaborator entirely, and the menu's items follow: an owner gets
 * the four it can act on, a writer the one it can.
 *
 * The card draws the shuffle and the menu as siblings in its own action band, so
 * the shuffle sits immediately left of the menu icon, and the row keeps them
 * wrapped in an action row under the play.
 *
 * While the queue is on this playlist the transport replaces the standalone
 * play and sits above the action row, which is the header's own swap; it stays
 * while paused, because the steps are the queue's and not the play's. It is
 * drawn only when the caller offers both steps, so the library's item keeps its
 * single control and the detail's header is the one that can skip.
 *
 * `ownerName` is the resolved display name of a playlist that is not the
 * account's, and null when the directory does not carry the owner. It is drawn
 * only for a shared playlist: on the account's own playlist `access` is `owner`,
 * which already says the item is theirs, so a "shared by" line there would be a
 * sentence about the person reading it. A null name draws nothing at all rather
 * than a placeholder, because a placeholder reads as a decision about who owns
 * the playlist, and the share indicator beside the name is the honest fallback.
 */

interface PlaylistHeaderProps {
  playlist: Playlist;
  ownerName?: string | null;
  /* The component's two arrangements. The row is the default and the library's
   * item; the card is the playlist detail's left column at 320px. */
  arrangement?: 'row' | 'card';
  /*
   * The action column. Each action is optional and its control is absent when
   * the callback is absent, which is how the three access levels gate the menu
   * by absence rather than by disabling: a control that is there and cannot be
   * pressed is worse than no control. The play and the shuffle are playback
   * facts and are offered at every level; the overflow and its items stay with
   * the owner and the writer.
   */
  onPlay?: () => void;
  playing?: boolean;
  /*
   * Whether this playlist is the one the queue is on, paused or playing. The
   * transport's steps act on the queue, so they stay on the card whenever the
   * card is the queue's own and the caller offers both, and a playlist the queue
   * is not on keeps the single play that starts it.
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
  onSync?: () => void;
  onRename?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  syncing?: boolean;
  heading?: boolean;
  onOpen?: () => void;
  showSyncTime?: boolean;
  now?: Date;
}

interface ShareMark {
  readonly state: 'own-private' | 'own-shared' | 'collab';
  readonly label: string;
  readonly Icon: typeof IconLock;
}

interface MenuItem {
  readonly key: string;
  readonly label: string;
  readonly Icon: typeof IconLock;
  readonly onSelect: () => void;
  readonly destructive?: true;
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
      label: 'You are a collaborator',
      Icon: IconUserShare
    };
  }

  if (playlist.hasShares) {
    return {
      state: 'own-shared',
      label: 'Shared playlist',
      Icon: IconLockShare
    };
  }

  return { state: 'own-private', label: 'Private playlist', Icon: IconLock };
}

export default function PlaylistHeader({
  playlist,
  ownerName = null,
  arrangement = 'row',
  onPlay,
  playing = false,
  current = false,
  onSkipBack,
  onSkipNext,
  hasNext = true,
  onShuffle,
  shuffled = false,
  onSync,
  onRename,
  onShare,
  onDelete,
  syncing = false,
  heading = false,
  onOpen,
  showSyncTime = false,
  now = new Date()
}: PlaylistHeaderProps) {
  const mark = shareMark(playlist);
  const sharedBy =
    playlist.access !== 'owner' && ownerName !== null ? ownerName : null;
  /* The identity hue a no-artwork cover draws. Derived from the id, so it is the
   * same sleeve wherever this playlist appears and it survives a reload. */
  const sleeve = sleeveIndex(playlist.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLSpanElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /* Whether the next open should land on the last item (ArrowUp) or the first. */
  const menuFocusLastRef = useRef(false);
  const { run, endRun } = usePlayPauseMorph(playing);

  const openFromClick =
    onOpen === undefined
      ? undefined
      : (event: ReactMouseEvent<HTMLDivElement>): void => {
          const target = event.target as HTMLElement;

          if (target.closest('a, button, [role="menu"]') !== null) {
            return;
          }

          onOpen();
        };

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

  /*
   * The menu closes on a press outside it and on Escape, which is the whole
   * behaviour of a menu button that opens onto a small set of items. Escape hands
   * focus back to the button, so the keyboard never lands on nothing. A press
   * inside is left alone so an item's own handler can run.
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
        closeMenu();
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

  /*
   * The overflow's items, by access. A read collaborator gets no overflow at
   * all, not an empty one: a menu with nothing in it is a control that opens
   * onto a blank. A writer gets the one item it may use; the owner gets all
   * four, and the rule before Delete is the header's own.
   */
  const menuItems = (() => {
    if (playlist.access === 'owner') {
      const items: (MenuItem | null)[] = [
        onShare === undefined
          ? null
          : {
              key: 'share',
              label: 'Share',
              Icon: IconShare,
              onSelect: onShare
            },
        onRename === undefined
          ? null
          : {
              key: 'rename',
              label: 'Rename',
              Icon: IconPencil,
              onSelect: onRename
            },
        onSync === undefined
          ? null
          : {
              key: 'sync',
              label: 'Sync now',
              Icon: IconRotate,
              onSelect: onSync
            },
        onDelete === undefined
          ? null
          : {
              key: 'delete',
              label: 'Delete playlist',
              Icon: IconTrash,
              onSelect: onDelete,
              destructive: true
            }
      ];

      return items.filter((item): item is MenuItem => item !== null);
    }

    if (playlist.access === 'write') {
      const items: (MenuItem | null)[] = [
        onSync === undefined
          ? null
          : {
              key: 'sync',
              label: 'Sync now',
              Icon: IconRotate,
              onSelect: onSync
            }
      ];

      return items.filter((item): item is MenuItem => item !== null);
    }

    return [];
  })();

  const playable = playlist.trackCount > 0;
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
        aria-label={playing ? 'Pause this playlist' : 'Play this playlist'}
        disabled={!playable}
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

  const primaryControl = showTransport ? (
    <div className={styles.playlistHeader__transport}>
      <button
        type="button"
        className={styles.playlistHeader__step}
        aria-label="Skip back"
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
        aria-label="Track next"
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

  const shuffleControl =
    onShuffle === undefined ? null : (
      <button
        type="button"
        className={styles.playlistHeader__iconBtn}
        aria-pressed={shuffled}
        aria-label={`Shuffle ${playlist.name}`}
        onClick={onShuffle}>
        <IconArrowsShuffle
          className={styles.playlistHeader__icon}
          aria-hidden="true"
          focusable="false"
        />
      </button>
    );

  const menuControl =
    menuItems.length === 0 ? null : (
      <span className={styles.playlistHeader__menuAnchor} ref={menuAnchorRef}>
        <button
          ref={menuButtonRef}
          type="button"
          className={styles.playlistHeader__iconBtn}
          aria-label={`More actions for ${playlist.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
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
            {menuItems.map((item, index) => (
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
                  disabled={item.key === 'sync' && syncing}
                  onClick={() => {
                    closeMenu();
                    item.onSelect();
                  }}>
                  <item.Icon
                    className={styles.playlistHeader__menuIcon}
                    aria-hidden="true"
                    focusable="false"
                  />
                  {item.label}
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
            title={playlist.name}>
            {playlist.name}
          </Link>
        )}
        <span
          className={styles.playlistHeader__share}
          data-share={mark.state}
          role="img"
          aria-label={mark.label}>
          {/*
           * The indicator is not a control and it sits inside the same name block
           * as the link, so its state is read with the playlist name already in
           * earshot. Naming the playlist here too would announce it twice on every
           * row, the same reason the cover link is hidden; the state is the whole
           * of what the mark adds, so the name stays out.
           */}
          <mark.Icon
            className={styles.playlistHeader__shareIcon}
            aria-hidden="true"
            focusable="false"
          />
          <span className={styles.playlistHeader__shareTip} role="presentation">
            {mark.label}
          </span>
        </span>
      </div>
      <div className={styles.playlistHeader__meta}>
        <span
          className={styles.playlistHeader__state}
          data-state={playlist.syncStatus}>
          {syncStateLabel(playlist.syncStatus)}
        </span>
        {showSyncTime ? (
          <>
            <span className={styles.playlistHeader__sep} aria-hidden="true">
              &middot;
            </span>
            <span className={styles.playlistHeader__time}>
              {formatLastSynced(lastSyncedAt, now)}
            </span>
          </>
        ) : null}
      </div>
      <div className={styles.playlistHeader__count}>
        <span>{playlist.trackCount}</span>
        <span className={styles.playlistHeader__countUnit}>
          {trackCountUnit(playlist.trackCount)}
        </span>
      </div>
      {sharedBy === null ? null : (
        <p className={styles.playlistHeader__owner}>Shared by {sharedBy}</p>
      )}
    </>
  );

  if (arrangement === 'card') {
    return (
      <div
        className={styles.playlistHeader}
        data-arrangement="card"
        data-open={onOpen === undefined ? undefined : 'true'}
        onClick={openFromClick}
        data-state={playing ? 'playing' : 'paused'}>
        <div
          className={styles.playlistHeader__mart}
          data-art={playlist.coverUrl === null ? 'no-art' : 'art'}
          data-sleeve={playlist.coverUrl === null ? sleeve : undefined}>
          {playlist.coverUrl === null ? null : (
            <img
              className={styles.playlistHeader__martArt}
              src={playlist.coverUrl}
              alt=""
            />
          )}
          <div className={styles.playlistHeader__mscrim} aria-hidden="true" />
          <div className={styles.playlistHeader__macts}>
            {primaryControl}
            <div className={styles.playlistHeader__mactsRight}>
              {shuffleControl}
              {menuControl}
            </div>
          </div>
        </div>
        <div className={styles.playlistHeader__munder}>{identity}</div>
      </div>
    );
  }

  return (
    <div
      className={styles.playlistHeader}
      data-arrangement="row"
      data-open={onOpen === undefined ? undefined : 'true'}
      onClick={openFromClick}
      data-state={playing ? 'playing' : 'paused'}>
      <Link
        to="/playlists/$playlistId"
        params={{ playlistId: playlist.id }}
        className={styles.playlistHeader__cover}
        aria-hidden="true"
        tabIndex={-1}
        data-art={playlist.coverUrl === null ? 'no-art' : 'art'}
        data-sleeve={playlist.coverUrl === null ? sleeve : undefined}>
        {playlist.coverUrl === null ? null : (
          <img
            className={styles.playlistHeader__art}
            src={playlist.coverUrl}
            alt=""
          />
        )}
      </Link>
      <div className={styles.playlistHeader__body}>{identity}</div>
      <div className={styles.playlistHeader__actions}>
        {primaryControl}
        {shuffleControl === null && menuControl === null ? null : (
          <div className={styles.playlistHeader__actionRow}>
            {shuffleControl}
            {menuControl}
          </div>
        )}
      </div>
    </div>
  );
}
