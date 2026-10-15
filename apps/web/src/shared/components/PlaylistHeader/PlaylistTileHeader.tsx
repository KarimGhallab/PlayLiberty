import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import type { Playlist } from '@playliberty/contracts';

import type { PlaylistAction } from '../../playlistActions/playlistActions';
import styles from './PlaylistHeader.module.scss';
import { playlistDoor } from './playlistDoor';
import { usePlaylistHeader } from './usePlaylistHeader';

/*
 * The tile arrangement of the playlist header: the cover as a block above the
 * identity, with the library's own mark and the two controls in a row under it.
 * The library draws it for each playlist in its gallery, which is the one surface
 * that holds many playlists at once.
 *
 * The tile is a door by definition, so `onOpen` is required rather than optional:
 * the library is a gallery of destinations, and the whole surface is the press
 * that opens one. The name and the cover stay the two links of it, and the
 * controls carve themselves out of the press.
 *
 * A tile that is the queue while the player runs marks itself the way the detail's
 * card does, through `data-state` and the emphasis line along its foot, and not
 * with the row's equalizer strip: the strip is the row's own mark and belongs to
 * the detail's narrow arrangement.
 *
 * What the tile does not offer is anything the library cannot honour: no play, no
 * transport and no retry, so those props are absent rather than accepted and
 * ignored. The identity, the name, the share mark, the count and the sync line
 * are the seam's, so the tile and the row can never disagree about what a
 * playlist says.
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
  /* Start this playlist, shuffled, or turn its shuffle off. */
  onShuffle: () => void;
  shuffled?: boolean;
  /* The overflow's items, already gated by access. Empty for a reader. */
  menu: readonly PlaylistAction[];
  /* Open the playlist. */
  onOpen: () => void;
}

export default function PlaylistTileHeader({
  playlist,
  ownerName,
  pending = false,
  current = false,
  playing = false,
  mark,
  onShuffle,
  shuffled = false,
  menu,
  onOpen
}: PlaylistTileHeaderProps) {
  const { sleeve, cover, onCoverError, shuffleControl, menuControl, identity } =
    usePlaylistHeader({
      playlist,
      ownerName,
      pending,
      current,
      playing,
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
      <Link
        to="/playlists/$playlistId"
        params={{ playlistId: playlist.id }}
        className={styles.playlistHeader__tart}
        aria-hidden="true"
        tabIndex={-1}
        aria-disabled={pending ? true : undefined}
        onClick={pending ? event => event.preventDefault() : undefined}
        data-art={cover === null ? 'no-art' : 'art'}
        data-sleeve={cover === null ? sleeve : undefined}>
        {cover === null ? null : (
          <img
            className={styles.playlistHeader__tartArt}
            src={cover}
            alt=""
            loading="eager"
            decoding="async"
            onError={onCoverError}
          />
        )}
      </Link>
      <div className={styles.playlistHeader__tunder}>
        <div className={styles.playlistHeader__tidentity}>{identity}</div>
        <div className={styles.playlistHeader__tacts}>
          {mark}
          {shuffleControl}
          {menuControl}
        </div>
      </div>
    </div>
  );
}
