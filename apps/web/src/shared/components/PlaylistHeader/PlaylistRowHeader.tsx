import { Link } from '@tanstack/react-router';

import TrackBars from '../TrackBars';
import styles from './PlaylistHeader.module.scss';
import { playlistDoor } from './playlistDoor';
import type { PlaylistHeaderSeam } from './usePlaylistHeader';
import { usePlaylistHeader } from './usePlaylistHeader';

/*
 * The row arrangement of the playlist header: the cover beside the identity
 * block, the actions in a column at the end. The library draws it for each item
 * and the playlist detail draws it under 768px, where the card's height does not
 * fit.
 *
 * The row is the one arrangement that is a door: `onOpen` is offered only by a
 * surface whose row opens something other than itself, which is the library and
 * never the detail. A press anywhere on the row opens it except on a link, a
 * button or the open menu, so the controls and the two links carve themselves
 * out. `showSyncTime` and `now` belong to the same surface: the library's
 * gallery is where the elapsed line is read, and the detail's row does not ask
 * for it.
 *
 * The cover is a link of its own, hidden from assistive technology so the name
 * carries the one announcement per item, and it draws the playing bars while
 * the queue is this playlist. The cover defers its image, because the gallery
 * draws one per item.
 */

export interface PlaylistRowHeaderProps extends PlaylistHeaderSeam {
  /* Open the playlist. Absent where the row is already the page it would open. */
  onOpen?: () => void;
}

export default function PlaylistRowHeader({
  playlist,
  onOpen,
  heading = false,
  ground = false,
  playing = false,
  current = false,
  pending = false,
  ...seam
}: PlaylistRowHeaderProps) {
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
    playlist,
    heading,
    ground,
    playing,
    current,
    pending
  });

  const openFromClick = onOpen === undefined ? undefined : playlistDoor(onOpen);

  return (
    <div
      className={styles.playlistHeader}
      data-arrangement="row"
      data-heading={heading ? 'true' : undefined}
      data-ground={ground ? 'true' : undefined}
      data-open={onOpen === undefined || pending ? undefined : 'true'}
      data-pending={pending ? 'true' : undefined}
      aria-busy={pending ? true : undefined}
      onClick={pending ? undefined : openFromClick}
      data-state={playing ? 'playing' : 'paused'}>
      {groundElement}
      <Link
        to="/playlists/$playlistId"
        params={{ playlistId: playlist.id }}
        className={styles.playlistHeader__cover}
        aria-hidden="true"
        tabIndex={-1}
        aria-disabled={pending ? true : undefined}
        onClick={pending ? event => event.preventDefault() : undefined}
        data-art={cover === null ? 'no-art' : 'art'}
        data-sleeve={cover === null ? sleeve : undefined}>
        {cover === null ? null : (
          <img
            className={styles.playlistHeader__art}
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            onError={onCoverError}
          />
        )}
        {current && playing ? (
          <>
            <span
              className={styles.playlistHeader__barsScrim}
              aria-hidden="true"
            />
            <TrackBars
              className={styles.playlistHeader__bars}
              barClassName={styles.playlistHeader__bar}
              playing={playing}
            />
          </>
        ) : null}
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
