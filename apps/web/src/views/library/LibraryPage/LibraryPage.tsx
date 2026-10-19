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
  usePlayTransition
} from '../../../shared/player/usePlayTransition/usePlayTransition';
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
 * The displaced delete never reached the server, so naming the playlist it
 * dropped is the honest correction rather than a count.
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
 * Four states and no fifth: loading, failure, the empty gallery, the list. The
 * page owns the one undo window, so a second delete replaces the first.
 */
export default function LibraryPage() {
  const { t } = useI18n();
  const playlists = usePlaylists();
  const directory = useAccountDirectory();
  const createPlaylist = useCreatePlaylist();
  const deferred = useDeferredAction();
  const { play, shuffle, refusal } = usePlayTransition();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const docked = usePlayerStore(state => currentTrack(state) !== null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pinRefused, setPinRefused] = useState<Error | null>(null);
  const pinnedHeadingId = useId();

  /*
   * The directory may be pending, failed, or short of the owner, so the name
   * resolves to null and the item falls back to its share indicator.
   */
  const directoryItems = directory.data ?? [];

  const refused = problemSentence(t, createPlaylist.error);

  const items = playlists.isSuccess ? playlists.data.items : [];

  /*
   * The page filters and never sorts, so both groups keep the server's order.
   */
  const pinned = items.filter(playlist => playlist.pinned);
  const rest = items.filter(playlist => !playlist.pinned);

  const isEmpty = playlists.isSuccess && items.length === 0;

  /* The refusal withdraws on the window the other notices use. */
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
        onPlay={() => play(playlist)}
        onShuffle={() => shuffle(playlist)}
        onPinRefused={error => setPinRefused(error)}
      />{' '}
    </li>
  );

  /*
   * Success is the one close the dialog does not initiate, so the page drops
   * `open` and the dialog runs its usual fade.
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
