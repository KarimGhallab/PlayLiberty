import { Link } from '@tanstack/react-router';

import TrackBars from '../TrackBars';
import styles from './PlaylistHeader.module.scss';
import { playlistDoor } from './playlistDoor';
import type { PlaylistHeaderSeam } from './usePlaylistHeader';
import { usePlaylistHeader } from './usePlaylistHeader';

/*
 * The row arrangement: the cover beside the identity block, the actions in a
 * column at the end. `onOpen` is offered only where the row opens something
 * other than itself. The cover link is hidden from AT so the name announces.
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
    identity,
    door
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
        {...door}
        to="/playlists/$playlistId"
        params={{ playlistId: playlist.id }}
        className={styles.playlistHeader__cover}
        aria-hidden="true"
        tabIndex={-1}
        data-art={cover === null ? 'no-art' : 'art'}
        data-sleeve={sleeve}>
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
