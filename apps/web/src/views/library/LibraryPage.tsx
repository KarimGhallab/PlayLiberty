import { IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { ApiError } from '../../shared/api/client';
import {
  ownerNameFrom,
  useAccountDirectory,
  useCreatePlaylist,
  usePlaylists
} from '../../shared/api/queries';
import PlaylistHeader from '../../shared/components/PlaylistHeader';

import AddPlaylistDialog from './AddPlaylistDialog';
import EmptyGallery from './EmptyGallery';
import styles from './LibraryPage.module.scss';

/*
 * The library, at `/`. The list of playlists is the only entry point to content,
 * so this is the route a user lands on. Four states and no fifth: loading, a
 * failed read, the empty gallery, and the populated list. Each item is the shared
 * playlist header, so this screen draws no item of its own.
 *
 * The add control lives in the header and, when there is nothing at all, again on
 * the gallery. Both open one dialog, and the dialog is the screen's only. On
 * success the dialog closes and the list is invalidated, so the new playlist
 * arrives from the server carrying the state the route wrote rather than from a
 * row this screen invented; the person stays here and watches it appear, rather
 * than being taken into a playlist they have not seen yet.
 */
export default function LibraryPage() {
  const playlists = usePlaylists();
  const directory = useAccountDirectory();
  const createPlaylist = useCreatePlaylist();
  const [dialogOpen, setDialogOpen] = useState(false);

  /*
   * The owner line needs the directory, and the directory is a second read that
   * may be pending, failed or short of the owner. In every one of those cases the
   * resolved name is null and the item falls back to its share indicator, so the
   * line never blocks the list and never invents a name.
   */
  const directoryItems = directory.data ?? [];

  /* The server's own `detail`, which is the message the field shows. */
  const refused =
    createPlaylist.error instanceof ApiError
      ? (createPlaylist.error.problem?.detail ?? null)
      : null;

  /*
   * The dialog reports the end of its exit, which is the moment to drop anything
   * it was holding. Success is the one close the dialog does not initiate, so the
   * page sets `open` false and the dialog runs the same fade every other close
   * runs; the list is already invalidated by the mutation, so the read that
   * follows carries the new playlist and the screen they are standing on is the
   * one that gains it.
   */
  useEffect(() => {
    if (createPlaylist.isSuccess) {
      setDialogOpen(false);
    }
  }, [createPlaylist.isSuccess]);

  return (
    <main className={styles.library}>
      <div className={styles.library__head}>
        <h1 className={styles.library__title}>Playlists</h1>
        <button
          type="button"
          className={styles.library__add}
          onClick={() => setDialogOpen(true)}>
          <IconPlus
            className={styles.library__addIcon}
            aria-hidden="true"
            focusable="false"
          />
          Add a playlist
        </button>
      </div>
      {playlists.isPending ? (
        <p className={styles.library__note}>Loading playlists.</p>
      ) : null}
      {playlists.isError ? (
        <p className={styles.library__note} role="alert">
          Playlists could not be loaded.
        </p>
      ) : null}
      {playlists.isSuccess && playlists.data.items.length === 0 ? (
        <EmptyGallery onAdd={() => setDialogOpen(true)} />
      ) : null}
      {playlists.isSuccess && playlists.data.items.length > 0 ? (
        <ul className={styles.library__list}>
          {playlists.data.items.map(playlist => (
            <li key={playlist.id} className={styles.library__item}>
              <PlaylistHeader
                playlist={playlist}
                ownerName={ownerNameFrom(
                  directoryItems,
                  playlist.ownerAccountId
                )}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <AddPlaylistDialog
        open={dialogOpen}
        onSubmit={url => createPlaylist.mutate(url)}
        onClose={() => {
          setDialogOpen(false);
          createPlaylist.reset();
        }}
        isWorking={createPlaylist.isPending}
        problem={refused}
      />
    </main>
  );
}
