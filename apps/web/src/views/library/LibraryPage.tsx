import { usePlaylists } from '../../shared/api/queries';
import PlaylistHeader from '../../shared/components/PlaylistHeader';

import EmptyGallery from './EmptyGallery';
import styles from './LibraryPage.module.scss';

/*
 * The library, at `/`. The list of playlists is the only entry point to content,
 * so this is the route a user lands on. Four states and no fifth: loading, a
 * failed read, the empty gallery, and the populated list. Each item is the shared
 * playlist header, so this screen draws no item of its own.
 */
export default function LibraryPage() {
  const playlists = usePlaylists();

  /*
   * Ticket 03 replaces this with the dialog's open action. Until then the
   * gallery's control is present and wired to nothing, which is the scaffold's
   * own placeholder and not a control that lies about what it does.
   */
  const openAddDialog = () => undefined;

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
        <EmptyGallery onAdd={openAddDialog} />
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
