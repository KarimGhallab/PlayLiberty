import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import styles from './PlaylistHeader.module.scss';
import type { PlaylistHeaderSeam } from './usePlaylistHeader';
import { usePlaylistHeader } from './usePlaylistHeader';

/*
 * The card arrangement of the playlist header: the cover as a square block above
 * the identity, the actions on the cover's scrim. It has two consumers, and the
 * `item` flag is the whole of the difference between them.
 *
 * The playlist detail draws it as its hero in its 320px left column above 768px,
 * where the page is the playlist and the header is the block at the top of it.
 * The hero is not a door: it is already the page it would open, so it carries no
 * cover link and no `onOpen`, and it does not draw the elapsed sync line, which
 * the library's row is the surface for.
 */

export type PlaylistCardHeaderProps = Omit<
  PlaylistHeaderSeam,
  'showSyncTime' | 'now' | 'statusLine'
> & {
  /* Whether the card is one item of the library's grid rather than the detail's
   * hero. */
  item?: boolean;
  /* The library's own mark, drawn at the end of the name row. It is the item's,
   * because its counts come from the list the gallery holds. */
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
    identity
  } = usePlaylistHeader({
    ...seam,
    heading,
    ground,
    playing,
    pending,
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
      <div
        className={styles.playlistHeader__mart}
        data-art={cover === null ? 'no-art' : 'art'}
        data-sleeve={cover === null ? sleeve : undefined}>
        {cover === null ? null : (
          <img
            className={styles.playlistHeader__martArt}
            src={cover}
            alt=""
            decoding="async"
            onError={onCoverError}
          />
        )}
        <div className={styles.playlistHeader__mscrim} aria-hidden="true" />
        {item ? (
          <Link
            to="/playlists/$playlistId"
            params={{ playlistId: seam.playlist.id }}
            className={styles.playlistHeader__martLink}
            aria-hidden="true"
            tabIndex={-1}
            aria-disabled={pending ? true : undefined}
            onClick={pending ? event => event.preventDefault() : undefined}
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
      {/* The item's overflow is outside the picture and not on it: the picture
       * clips, because the cover is a square with rounded corners, and a panel
       * hanging from a chip on a 136px cover would be cut off by it. Its chip still
       * sits on the cover's top-right corner, positioned from the card instead. */}
      {item ? menuControl : null}
      <div className={styles.playlistHeader__munder}>{identity}</div>
    </div>
  );
}
