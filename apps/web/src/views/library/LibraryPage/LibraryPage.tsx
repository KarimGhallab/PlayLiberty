import { IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { ApiError } from '../../../shared/api/client/client';
import {
  ownerNameFrom,
  useAccountDirectory,
  useCreatePlaylist,
  usePlaylists
} from '../../../shared/api/queries/queries';
import NoticeToast from '../../../shared/components/NoticeToast/NoticeToast';
import UndoToast from '../../../shared/components/UndoToast/UndoToast';
import {
  UNDO_WINDOW_MS,
  useDeferredAction
} from '../../../shared/components/useDeferredAction/useDeferredAction';
import {
  NOTICE_WINDOW_MS,
  refusalNotice,
  useShufflePlaylist
} from '../../../shared/player/useShufflePlaylist/useShufflePlaylist';

import AddPlaylistDialog from '../AddPlaylistDialog/AddPlaylistDialog';
import EmptyGallery from '../EmptyGallery/EmptyGallery';
import LibrarySkeleton from '../LibrarySkeleton/LibrarySkeleton';
import PlaylistListItem from '../PlaylistListItem';
import styles from './LibraryPage.module.scss';

/*
 * The sentence for the intent a second delete dropped. The displaced action's
 * name is the whole of it: the first delete never reaches the server, so saying
 * which playlist is no longer going is the honest correction, not a count.
 */
function replacedSentence(replaced: { detail: string | null } | null) {
  if (replaced === null) {
    return null;
  }
  if (replaced.detail === null) {
    return 'The earlier action was replaced.';
  }
  return `“${replaced.detail}” will not be deleted.`;
}

/*
 * The library, at `/`. The list of playlists is the only entry point to content,
 * so this is the route a user lands on. Four states and no fifth: loading, a
 * failed read, the empty gallery, and the populated list. Each item is the shared
 * playlist header with its own actions wired, one `PlaylistListItem` per row; the
 * page itself draws the list and nothing that resembles a header.
 *
 * The add control lives in the header and, when there is nothing at all, again on
 * the gallery. Both open one dialog, and the dialog is the screen's only. On
 * success the dialog closes and the list is invalidated, so the new playlist
 * arrives from the server carrying the state the route wrote rather than from a
 * row this screen invented; the person stays here and watches it appear, rather
 * than being taken into a playlist they have not seen yet.
 *
 * The page owns the one undo window, because a delete is the one destructive
 * action an item offers and two of them in the same window must replace rather
 * than stack. An item hands its own commit to this window; the toast below is the
 * page's single surface for it.
 */
export default function LibraryPage() {
  const playlists = usePlaylists();
  const directory = useAccountDirectory();
  const createPlaylist = useCreatePlaylist();
  const deferred = useDeferredAction();
  const { shufflePlaylist, refusal } = useShufflePlaylist();
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
        <h1 className={styles.library__title}>PlayLiberty</h1>
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
      {playlists.isPending ? <LibrarySkeleton /> : null}
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
              <PlaylistListItem
                playlist={playlist}
                ownerName={ownerNameFrom(
                  directoryItems,
                  playlist.ownerAccountId
                )}
                defer={deferred.defer}
                onShuffle={() => shufflePlaylist(playlist)}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <AddPlaylistDialog
        open={dialogOpen}
        onSubmit={(url, skipNonMusic) =>
          createPlaylist.mutate({ url, skipNonMusic })
        }
        onClose={() => {
          setDialogOpen(false);
          createPlaylist.reset();
        }}
        isWorking={createPlaylist.isPending}
        problem={refused}
      />
      {deferred.pending !== null ? (
        <UndoToast
          message={deferred.pending.message}
          detail={deferred.pending.detail}
          replacedLabel={replacedSentence(deferred.replaced)}
          windowKey={deferred.windowId}
          durationMs={UNDO_WINDOW_MS}
          actionLabel="Cancel"
          onAction={deferred.cancel}
          onDismiss={deferred.cancel}
        />
      ) : null}
      {refusal === null ? null : (
        <NoticeToast
          {...refusalNotice(refusal)}
          durationMs={NOTICE_WINDOW_MS}
        />
      )}
    </main>
  );
}
