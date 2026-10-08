import { IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import type { Messages, Translator } from '@playliberty/i18n';
import { useI18n } from '@playliberty/i18n';

import { problemSentence } from '../../../shared/api/problem/problem';
import {
  ownerNameFrom,
  useAccountDirectory,
  useCreatePlaylist,
  usePlaylists
} from '../../../shared/api/queries/queries';
import NoticeToast from '../../../shared/components/NoticeToast/NoticeToast';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
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
import LanguageMenu from '../LanguageMenu/LanguageMenu';
import LibrarySkeleton from '../LibrarySkeleton/LibrarySkeleton';
import PlaylistListItem from '../PlaylistListItem';
import styles from './LibraryPage.module.scss';

/*
 * The sentence for the intent a second delete dropped. The displaced action's
 * name is the whole of it: the first delete never reaches the server, so saying
 * which playlist is no longer going is the honest correction, not a count.
 */
function replacedSentence(
  replaced: { detail: string | null } | null,
  t: Translator<Messages>
) {
  if (replaced === null) {
    return null;
  }
  if (replaced.detail === null) {
    return t('library.replaced');
  }
  return t('library.willNotDelete', { name: replaced.detail });
}

/*
 * The library, at `/`. The list of playlists is the only entry point to content,
 * so this is the route a user lands on. Four states and no fifth: loading, a
 * failed read, the empty gallery, and the populated list. Each item is the shared
 * playlist header with its own actions wired, one `PlaylistListItem` per row; the
 * page itself draws the list and nothing that resembles a header.
 *
 * The add control lives in the header, and on the empty state it is the gallery's
 * framed action alone: the header's is suppressed there so the one screen where a
 * person has seen neither control offers one invitation, not two. Both open one
 * dialog, and the dialog is the screen's only. On success the dialog closes and
 * the list is invalidated, so the new playlist
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
  const { t } = useI18n();
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

  /* The sentence for the refusal, from the catalog when the code is known. */
  const refused = problemSentence(t, createPlaylist.error);

  const isEmpty = playlists.isSuccess && playlists.data.items.length === 0;

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
        <h1 className={styles.library__title}>{t('app.name')}</h1>
        <div className={styles.library__actions}>
          <LanguageMenu />
          {isEmpty ? null : (
            <button
              type="button"
              className={styles.library__add}
              onClick={() => setDialogOpen(true)}>
              <IconPlus
                className={styles.library__addIcon}
                aria-hidden="true"
                focusable="false"
              />
              {t('library.add')}
            </button>
          )}
        </div>
      </div>
      {playlists.isPending ? <LibrarySkeleton /> : null}
      {playlists.isError ? (
        <ReadFailure
          message={t('library.readFailed')}
          error={playlists.error}
          onRetry={() => void playlists.refetch()}
          retrying={playlists.isFetching}
        />
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
                pending={deferred.pending?.id === playlist.id}
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
          replacedLabel={replacedSentence(deferred.replaced, t)}
          windowKey={deferred.windowId}
          durationMs={UNDO_WINDOW_MS}
          actionLabel={t('common.cancel')}
          onAction={deferred.cancel}
          onDismiss={deferred.cancel}
        />
      ) : null}
      {refusal === null ? null : (
        <NoticeToast
          {...refusalNotice(refusal, t)}
          durationMs={NOTICE_WINDOW_MS}
        />
      )}
    </main>
  );
}
