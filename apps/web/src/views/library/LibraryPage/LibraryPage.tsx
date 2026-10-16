import { IconPlus } from '@tabler/icons-react';
import { useEffect, useId, useState } from 'react';

import type { PlaylistWithCounts } from '@playliberty/contracts';
import type { Messages, Translator } from '@playliberty/i18n';
import { useI18n } from '@playliberty/i18n';

import { problemSentence } from '../../../shared/api/problem/problem';
import {
  ownerNameFrom,
  useAccountDirectory,
  useCreatePlaylist,
  usePlaylists
} from '../../../shared/api/queries/queries';
import FloatingAction from '../../../shared/components/FloatingAction/FloatingAction';
import NoticeToast from '../../../shared/components/NoticeToast/NoticeToast';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import UndoToast from '../../../shared/components/UndoToast/UndoToast';
import {
  UNDO_WINDOW_MS,
  useDeferredAction
} from '../../../shared/components/useDeferredAction/useDeferredAction';
import { usePlayerStore } from '../../../shared/player/playerStore/playerStore';
import { currentTrack } from '../../../shared/player/types';
import {
  NOTICE_WINDOW_MS,
  refusalNotice,
  useStartPlaylist
} from '../../../shared/player/useStartPlaylist/useStartPlaylist';
import {
  MOBILE_QUERY,
  useMediaQuery
} from '../../../shared/useMediaQuery/useMediaQuery';

import AddPlaylistDialog from '../AddPlaylistDialog/AddPlaylistDialog';
import EmptyGallery from '../EmptyGallery/EmptyGallery';
import LanguageMenu from '../LanguageMenu/LanguageMenu';
import LibrarySkeleton from '../LibrarySkeleton/LibrarySkeleton';
import PlaylistItem from '../PlaylistItem';
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
 * The list of playlists is the only entry point to content, so this is the route
 * a user lands on. Four states and no fifth: loading, a failed read, the empty
 * gallery, and the populated list.
 *
 * The add control is a labelled button in the header on the web and a floating
 * round button on a phone, where the header's height is the gallery's to spend and
 * a word in it is 56.9% of a card's width. Only one of the two is drawn at a time,
 * because the two are one control at two widths and a second copy would be a
 * second invitation. On the empty state neither is drawn: the gallery's framed
 * action is alone there, so the one screen where a person has seen neither control
 * offers one invitation, not two. All three open one dialog. On success the dialog closes and the list is invalidated, so the new
 * playlist arrives from the server rather than from a row this screen invented;
 * the person stays here and watches it appear rather than being taken into a
 * playlist they have not seen yet.
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
  const { playPlaylist, shufflePlaylist, refusal } = useStartPlaylist();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const docked = usePlayerStore(state => currentTrack(state) !== null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pinRefused, setPinRefused] = useState<Error | null>(null);
  const pinnedHeadingId = useId();

  /*
   * The owner line needs the directory, and the directory is a second read that
   * may be pending, failed or short of the owner. In every one of those cases the
   * resolved name is null and the item falls back to its share indicator, so the
   * line never blocks the list and never invents a name.
   */
  const directoryItems = directory.data ?? [];

  const refused = problemSentence(t, createPlaylist.error);

  const items = playlists.isSuccess ? playlists.data.items : [];

  /*
   * The gallery is two groups over one read: the items whose flag is set, in the
   * server's own order, and the rest, which the read already ordered. The page
   * filters and never sorts, so the section's order is the read's and the list
   * below keeps the order it had.
   */
  const pinned = items.filter(playlist => playlist.pinned);
  const rest = items.filter(playlist => !playlist.pinned);

  const isEmpty = playlists.isSuccess && items.length === 0;

  /*
   * The pin's refusal withdraws itself on the same window the other notices use,
   * so a failed change does not stand over the gallery once it is read.
   */
  useEffect(() => {
    if (pinRefused === null) {
      return;
    }

    const timer = setTimeout(() => setPinRefused(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [pinRefused]);

  const renderItem = (playlist: PlaylistWithCounts) => (
    <li key={playlist.id} className={styles.library__cell}>
      <PlaylistItem
        playlist={playlist}
        ownerName={ownerNameFrom(directoryItems, playlist.ownerAccountId)}
        pending={deferred.pending?.id === playlist.id}
        layout={isMobile ? 'card' : 'tile'}
        defer={deferred.defer}
        onPlay={() => playPlaylist(playlist)}
        onShuffle={() => shufflePlaylist(playlist)}
        onPinRefused={error => setPinRefused(error)}
      />
    </li>
  );

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
    <main className={styles.library} data-player={docked ? 'true' : undefined}>
      <div className={styles.library__head}>
        <h1 className={styles.library__title}>{t('app.name')}</h1>
        <div className={styles.library__actions}>
          <LanguageMenu />
          {isEmpty || isMobile ? null : (
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
      {playlists.isPending ? (
        <LibrarySkeleton layout={isMobile ? 'card' : 'tile'} />
      ) : null}
      {playlists.isError ? (
        <ReadFailure
          message={t('library.readFailed')}
          error={playlists.error}
          onRetry={() => void playlists.refetch()}
          retrying={playlists.isFetching}
        />
      ) : null}
      {isEmpty ? <EmptyGallery onAdd={() => setDialogOpen(true)} /> : null}
      {playlists.isSuccess && pinned.length > 0 ? (
        <section aria-labelledby={pinnedHeadingId}>
          <h2 id={pinnedHeadingId} className={styles.library__sectionTitle}>
            {t('library.pinned')}
          </h2>
          <ul className={styles.library__grid}>{pinned.map(renderItem)}</ul>
        </section>
      ) : null}
      {/* A boundary needs two sides: an account that has pinned nothing, or one that
       * has pinned everything, sees the one list it has always seen. */}
      {playlists.isSuccess && pinned.length > 0 && rest.length > 0 ? (
        <hr className={styles.library__rule} />
      ) : null}
      {playlists.isSuccess && rest.length > 0 ? (
        <ul className={styles.library__grid}>{rest.map(renderItem)}</ul>
      ) : null}
      {isEmpty || !isMobile ? null : (
        <FloatingAction
          label={t('library.add')}
          onClick={() => setDialogOpen(true)}
        />
      )}
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
      {pinRefused === null ? null : (
        <NoticeToast
          message={t('library.pinFailed')}
          detail={problemSentence(t, pinRefused)}
          durationMs={NOTICE_WINDOW_MS}
        />
      )}
    </main>
  );
}
