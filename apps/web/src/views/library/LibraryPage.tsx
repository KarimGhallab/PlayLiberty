import { usePlaylists } from '../../shared/api/queries';
import PlaylistHeader from '../../shared/components/PlaylistHeader';

import styles from './LibraryPage.module.scss';

/*
 * The library, at `/`. The list of playlists is the only entry point to content,
 * so this is the route a user lands on. Each item is the shared playlist header,
 * so this screen draws no item of its own. The empty shelf and the add dialog
 * arrive in their own tickets; this one renders the populated list.
 */
export default function LibraryPage() {
  const playlists = usePlaylists();

  return (
    <main className={styles.library}>
      <h1 className={styles.library__title}>Playlists</h1>
      {playlists.isPending ? (
        <p className={styles.library__note}>Loading playlists.</p>
      ) : null}
      {playlists.isError ? (
        <p className={styles.library__note} role="alert">
          Playlists could not be loaded.
        </p>
      ) : null}
      {playlists.isSuccess && playlists.data.items.length === 0 ? (
        <p className={styles.library__note}>No playlists yet.</p>
      ) : null}
      {playlists.isSuccess && playlists.data.items.length > 0 ? (
        <ul className={styles.library__list}>
          {playlists.data.items.map(playlist => (
            <li key={playlist.id} className={styles.library__item}>
              <PlaylistHeader playlist={playlist} />
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
