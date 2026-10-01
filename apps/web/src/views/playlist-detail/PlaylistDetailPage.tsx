import { useParams } from '@tanstack/react-router';

import styles from './PlaylistDetailPage.module.scss';

/*
 * The playlist detail, at `/playlists/:id`. The scaffold renders the id and
 * nothing else; the header, the track list and the sync states are a feature
 * ticket.
 */
export default function PlaylistDetailPage() {
  const { playlistId } = useParams({ from: '/playlists/$playlistId' });

  return (
    <main className={styles.playlistDetail}>
      <h1 className={styles.playlistDetail__title}>Playlist</h1>
      <p className={styles.playlistDetail__id}>{playlistId}</p>
    </main>
  );
}
