import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import type { Playlist } from '@playliberty/contracts';

import type { PlaylistAction } from '../../playlistActions/playlistActions';
import styles from './PlaylistHeader.module.scss';
import { playlistDoor } from './playlistDoor';
import type { PlaybackStartControl } from './usePlaylistHeader';
import { usePlaylistHeader } from './usePlaylistHeader';

/*
 * The tile arrangement: the cover above the identity, the mark and the two
 * controls in a row under it. The cover is a div with a link inside rather than
 * a link itself, because a button inside an anchor is invalid HTML.
 */

export interface PlaylistTileHeaderProps {
  playlist: Playlist;
  ownerName?: string | null;
  /* Whether a deferred action is about to remove this playlist. */
  pending?: boolean;
  /* Whether this playlist is the one the queue is on, paused or playing. */
  current?: boolean;
  playing?: boolean;
  /* The library's own mark, drawn beside the controls. */
  mark?: ReactNode;
  /* Whether this playlist has anything to play; the count is not that fact. */
  playable?: boolean;
  /* The one play door, drawn on the cover's own corner. */
  onPlay?: () => void;
  /* Start this playlist, shuffled, or turn its shuffle off. */
  onShuffle: () => void;
  shuffled?: boolean;
  /* The overflow's items, already gated by access. Empty for a reader. */
  menu: readonly PlaylistAction[];
  onOpen: () => void;
  /* Whether this item's start control is waiting on its queue read. */
  playbackStarting?: boolean;
  /* Which of the two start controls was pressed. */
  startingControl?: PlaybackStartControl;
}

export default function PlaylistTileHeader({
  playlist,
  ownerName,
  pending = false,
  current = false,
  playing = false,
  mark,
  onPlay,
  playable = true,
  onShuffle,
  shuffled = false,
  menu,
  onOpen,
  playbackStarting = false,
  startingControl = 'play'
}: PlaylistTileHeaderProps) {
  const {
    sleeve,
    cover,
    onCoverError,
    primaryControl,
    shuffleControl,
    menuControl,
    identity,
    door
  } = usePlaylistHeader({
    playlist,
    ownerName,
    pending,
    current,
    playing,
    onPlay,
    playable,
    namedPlay: true,
    onShuffle,
    shuffled,
    playbackStarting,
    startingControl,
    menu,
    showSyncTime: true
  });

  return (
    <div
      className={styles.playlistHeader}
      data-arrangement="tile"
      data-pending={pending ? 'true' : undefined}
      data-open="true"
      data-state={playing ? 'playing' : 'paused'}
      aria-busy={pending ? true : undefined}
      onClick={pending ? undefined : playlistDoor(onOpen)}>
      <div className={styles.playlistHeader__tidentity}>{identity}</div>
      <div
        className={styles.playlistHeader__tart}
        data-art={cover === null ? 'no-art' : 'art'}
        data-sleeve={cover === null ? sleeve : undefined}>
        {cover === null ? null : (
          <img
            className={styles.playlistHeader__tartArt}
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            onError={onCoverError}
          />
        )}
        <Link
          {...door}
          to="/playlists/$playlistId"
          params={{ playlistId: playlist.id }}
          className={styles.playlistHeader__tartLink}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
      {primaryControl}
      <div className={styles.playlistHeader__tacts}>
        <span className={styles.playlistHeader__mark}>{mark}</span>
        {shuffleControl}
        {menuControl}
      </div>
      {/* The tile cannot clip its own playing line, so this box clips it. */}
      <span className={styles.playlistHeader__line} aria-hidden="true" />
    </div>
  );
}
