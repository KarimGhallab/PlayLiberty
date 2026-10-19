import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import styles from './PlaylistHeader.module.scss';
import type { PlaylistHeaderSeam } from './usePlaylistHeader';
import { usePlaylistHeader } from './usePlaylistHeader';

/*
 * The card arrangement: the cover as a square block above the identity, the
 * actions on the cover's scrim. The detail draws it as its hero, the library as
 * one item of its grid, and `item` is the whole of the difference.
 */

export type PlaylistCardHeaderProps = Omit<
  PlaylistHeaderSeam,
  'showSyncTime' | 'now' | 'statusLine'
> & {
  /* Whether the card is one item of the library's grid rather than the detail's
   * hero. */
  item?: boolean;
  /* The library's own mark, drawn beside the count. It is the item's, because
   * its counts come from the list the gallery holds. */
  mark?: ReactNode;
};

export default function PlaylistCardHeader({
  heading = false,
  ground = false,
  playing = false,
  pending = false,
  item = false,
  mark,
  ...seam
}: PlaylistCardHeaderProps) {
  const {
    sleeve,
    cover,
    onCoverError,
    ground: groundElement,
    primaryControl,
    shuffleControl,
    menuControl,
    identity,
    door
  } = usePlaylistHeader({
    ...seam,
    heading,
    ground,
    playing,
    pending,
    namedPlay: item,
    statusLine: item,
    mark: item ? mark : undefined
  });

  return (
    <div
      className={styles.playlistHeader}
      data-arrangement="card"
      data-item={item ? 'true' : undefined}
      data-heading={heading ? 'true' : undefined}
      data-ground={ground ? 'true' : undefined}
      data-pending={pending ? 'true' : undefined}
      aria-busy={pending ? true : undefined}
      data-state={playing ? 'playing' : 'paused'}>
      {groundElement}
      <div className={styles.playlistHeader__munder}>{identity}</div>
      <div
        className={styles.playlistHeader__mart}
        data-art={cover === null ? 'no-art' : 'art'}
        data-sleeve={cover === null ? sleeve : undefined}>
        {cover === null ? null : (
          <img
            className={styles.playlistHeader__martArt}
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            onError={onCoverError}
          />
        )}
        <div className={styles.playlistHeader__mscrim} aria-hidden="true" />
        {item ? (
          <Link
            {...door}
            to="/playlists/$playlistId"
            params={{ playlistId: seam.playlist.id }}
            className={styles.playlistHeader__martLink}
            aria-hidden="true"
            tabIndex={-1}
          />
        ) : null}
        {item ? (
          <span className={styles.playlistHeader__mshuffle}>
            {shuffleControl}
          </span>
        ) : null}
        <div className={styles.playlistHeader__macts}>
          {primaryControl}
          {item ? null : (
            <div className={styles.playlistHeader__mactsRight}>
              {shuffleControl}
              {menuControl}
            </div>
          )}
        </div>
      </div>
      {/* The item's overflow is outside the picture: it clips, so a panel
       * hanging from a chip on the cover would be cut off. */}
      {item ? menuControl : null}
    </div>
  );
}
