import { useParams } from '@tanstack/react-router';

import { usePlaylist, usePlaylistTracks } from '../../shared/api/queries';
import TrackRow from '../../shared/components/TrackRow';
import { usePlayerStore } from '../../shared/player/playerStore';
import { toPlayerTracks } from '../../shared/player/playerTracks';

import styles from './PlaylistDetailPage.module.scss';

/*
 * The playlist detail, at `/playlists/:id`. The track list is the queue's
 * surface and the place a track is chosen, and the heading names the playlist
 * the queue was built from.
 *
 * The list is drawn in the playlist's own order and every association appears,
 * playable or not, because a track that silently vanished from the list would
 * make "why is this track missing" unanswerable. The play control's presence is
 * the server's own file status, which is the same fact `toPlayerTracks` filters
 * on, so the list and the queue agree by construction: a track the list will not
 * offer a control for is a track the queue will not hold.
 */
export default function PlaylistDetailPage() {
  const { playlistId } = useParams({ from: '/playlists/$playlistId' });
  const playlist = usePlaylist(playlistId);
  const tracks = usePlaylistTracks(playlistId);
  const startQueue = usePlayerStore(state => state.startQueue);
  const setPlaying = usePlayerStore(state => state.setPlaying);
  const currentId = usePlayerStore(state => state.currentId);
  const isPlaying = usePlayerStore(state => state.isPlaying);

  const playTrack = (trackId: string): void => {
    /*
     * Pressing the current track is pause and resume, which keeps the place;
     * pressing another track builds the queue from this playlist and starts
     * there. The two are one control because the row's play is the door to the
     * queue, and the queue's own transport is the bar.
     */
    if (trackId === currentId) {
      setPlaying(!isPlaying);
      return;
    }

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
          {tracks.data.map(association => (
            <TrackRow
              key={association.track.id}
              association={association}
              current={association.track.id === currentId}
              playing={isPlaying}
              onPlay={playTrack}
            />
          ))}
        </ul>
      ) : null}
    </main>
  );
}
