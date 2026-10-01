import { formatLastSynced, formatTrackCount } from '@playliberty/ui-foundation';

import { usePlaylists } from '../../shared/api/queries';

import styles from './LibraryPage.module.scss';

function toDate(value: string | null): Date | null {
  return value === null ? null : new Date(value);
}

/*
 * The library, at `/`. The list of playlists is the only entry point to content,
 * so this is the route a user lands on. The scaffold renders the names, the
 * counts and the sync line; the real library is a feature ticket.
 */
export default function LibraryPage() {
  const playlists = usePlaylists();
  const now = new Date();

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
              <span className={styles.library__name}>{playlist.name}</span>
              <span className={styles.library__meta}>
                {formatTrackCount(playlist.trackCount)}
                {' · '}
                {formatLastSynced(toDate(playlist.lastSyncedAt), now)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
