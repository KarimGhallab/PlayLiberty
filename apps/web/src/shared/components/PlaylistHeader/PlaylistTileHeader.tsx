import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import type { Playlist } from '@playliberty/contracts';

import type { PlaylistAction } from '../../playlistActions/playlistActions';
import styles from './PlaylistHeader.module.scss';
import { playlistDoor } from './playlistDoor';
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
  /* The one play door, drawn on the cover's own corner. */
  onPlay?: () => void;
  /* Start this playlist, shuffled, or turn its shuffle off. */
  onShuffle: () => void;
  shuffled?: boolean;
  /* The overflow's items, already gated by access. Empty for a reader. */
  menu: readonly PlaylistAction[];
  onOpen: () => void;
}

export default function PlaylistTileHeader({
  playlist,
  ownerName,
  pending = false,
  current = false,
  playing = false,
  mark,
  onPlay,
  onShuffle,
  shuffled = false,
  menu,
  onOpen
}: PlaylistTileHeaderProps) {
  const {
    sleeve,
    cover,
    onCoverError,
    primaryControl,
    shuffleControl,
    menuControl,
    identity
  } = usePlaylistHeader({
    playlist,
    ownerName,
    pending,
    current,
    playing,
    onPlay,
    onShuffle,
    shuffled,
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
          to="/playlists/$playlistId"
          params={{ playlistId: playlist.id }}
          className={styles.playlistHeader__tartLink}
          aria-hidden="true"
          tabIndex={-1}
          aria-disabled={pending ? true : undefined}
          onClick={pending ? event => event.preventDefault() : undefined}
        />
        {primaryControl}
      </div>
      <div className={styles.playlistHeader__tunder}>
        <div className={styles.playlistHeader__tidentity}>{identity}</div>
        <div className={styles.playlistHeader__tacts}>
          <span className={styles.playlistHeader__mark}>{mark}</span>
          {shuffleControl}
          {menuControl}
        </div>
      </div>
      {/* The tile cannot clip its own playing line, so this box clips it. */}
      <span className={styles.playlistHeader__line} aria-hidden="true" />
    </div>
  );
}
