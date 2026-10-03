import { useParams } from '@tanstack/react-router';

import { usePlaylist, usePlaylistTracks } from '../../shared/api/queries';
import { usePlayerStore } from '../../shared/player/playerStore';
import { toPlayerTracks } from '../../shared/player/playerTracks';

import styles from './PlaylistDetailPage.module.scss';

/*
 * The playlist detail, at `/playlists/:id`.
 *
 * This is the tracer bullet for the queue and nothing more: the list exists so a
 * track can be pressed, which is what builds the queue. The real track list (the
 * playable control, the states, the order) and the player bar are ticket 04, and
 * the presentation here is deliberately unstyled for that reason.
 */
export default function PlaylistDetailPage() {
  const { playlistId } = useParams({ from: '/playlists/$playlistId' });
  const playlist = usePlaylist(playlistId);
  const tracks = usePlaylistTracks(playlistId);
  const startQueue = usePlayerStore(state => state.startQueue);

  const playTrack = (trackId: string): void => {
    if (tracks.data === undefined || playlist.data === undefined) {
      return;
    }

    startQueue(
      playlistId,
      toPlayerTracks(tracks.data, playlistId, playlist.data.name),
      trackId
    );
  };

  return (
    <main className={styles.playlistDetail}>
      <h1 className={styles.playlistDetail__title}>
        {playlist.data?.name ?? 'Playlist'}
      </h1>
      {tracks.isPending ? (
        <p className={styles.playlistDetail__note}>Loading tracks.</p>
      ) : null}
      {tracks.isError ? (
        <p className={styles.playlistDetail__note} role="alert">
          Tracks could not be loaded.
        </p>
      ) : null}
      {tracks.isSuccess && tracks.data.length === 0 ? (
        <p className={styles.playlistDetail__note}>No tracks yet.</p>
      ) : null}
      {tracks.isSuccess && tracks.data.length > 0 ? (
        <ul className={styles.playlistDetail__list}>
          {tracks.data.map(({ track, position }) => (
            <li key={track.id} className={styles.playlistDetail__item}>
              <button
                type="button"
                className={styles.playlistDetail__play}
                onClick={() => playTrack(track.id)}>
                Play {track.title}
              </button>
              <span className={styles.playlistDetail__position}>
                {position + 1}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
