import styles from './PlaylistHeader.module.scss';
import type { PlaylistHeaderSeam } from './usePlaylistHeader';
import { usePlaylistHeader } from './usePlaylistHeader';

/*
 * The card arrangement of the playlist header: the cover as a square block above
 * the identity, the actions on the cover's scrim. The playlist detail draws it
 * in its 320px left column above 768px, where the page is the playlist and the
 * header is its hero.
 *
 * The card is not a door: it is already the page it would open, so it carries no
 * `onOpen`, and it does not draw the elapsed sync line, which the gallery's row
 * is the surface for. Both are the row's own props, kept out of this interface
 * so a caller cannot pass a prop this arrangement never honours.
 *
 * The shuffle and the menu sit as siblings in the card's action band, so the
 * shuffle is immediately left of the overflow, and the cover loads eagerly
 * because it is the hero rather than one item of many.
 */

export type PlaylistCardHeaderProps = Omit<
  PlaylistHeaderSeam,
  'showSyncTime' | 'now'
>;

export default function PlaylistCardHeader({
  heading = false,
  ground = false,
  playing = false,
  pending = false,
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
  } = usePlaylistHeader({ ...seam, heading, ground, playing, pending });

  return (
    <div
      className={styles.playlistHeader}
      data-arrangement="card"
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
