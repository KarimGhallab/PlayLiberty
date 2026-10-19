import { IconPlus } from '@tabler/icons-react';
import { useEffect, useId, useState } from 'react';

import type { PlaylistWithCounts } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import { problemSentence } from '../../../shared/api/problem/problem';
import {
  ownerNameFrom,
  useAccountDirectory,
  useCreatePlaylist,
  usePlaylists
} from '../../../shared/api/queries/queries';
import FloatingAction from '../../../shared/components/FloatingAction/FloatingAction';
import LanguageMenu from '../../../shared/components/LanguageMenu/LanguageMenu';
import NoticeToast from '../../../shared/components/NoticeToast/NoticeToast';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import { useDeferredAction } from '../../../shared/components/useDeferredAction/useDeferredAction';
import { usePlayerStore } from '../../../shared/player/playerStore/playerStore';
import { currentTrack } from '../../../shared/player/types';
import {
  NOTICE_WINDOW_MS,
  refusalNotice,
  usePlayTransition
} from '../../../shared/player/usePlayTransition/usePlayTransition';
import { usePlaylistActions } from '../../../shared/playlistActions/playlistActions';
import {
  MOBILE_QUERY,
  useMediaQuery
} from '../../../shared/useMediaQuery/useMediaQuery';

import AddPlaylistDialog from '../AddPlaylistDialog/AddPlaylistDialog';
import EmptyGallery from '../EmptyGallery/EmptyGallery';
import LibrarySkeleton from '../LibrarySkeleton/LibrarySkeleton';
import PlaylistItem from '../PlaylistItem';
import styles from './LibraryPage.module.scss';

/*
 * Four states and no fifth: loading, failure, the empty gallery, the list. Each
 * delete opens its own undo window, so a second one stacks rather than replaces.
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
  const restHeadingId = useId();
  const actions = usePlaylistActions({
    defer: deferred.defer,
    deleteMessage: 'library.deleteDeferred',
    pin: { onRefused: error => setPinRefused(error) }
  });

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
  const grouped = pinned.length > 0 && rest.length > 0;

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
        pending={deferred.windows.some(entry => entry.id === playlist.id)}
        layout={isMobile ? 'card' : 'tile'}
        menu={actions.menuFor(playlist)}
        onPlay={() => play(playlist)}
        onShuffle={() => shuffle(playlist)}
      />{' '}
    </li>
  );

  const renderList = (list: readonly PlaylistWithCounts[]) => (
    <ul className={styles.library__grid}>{list.map(renderItem)}</ul>
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
          {renderList(pinned)}
        </section>
      ) : null}
      {/* A boundary needs two sides: an account that has pinned nothing, or one that
       * has pinned everything, sees the one list it has always seen. */}
      {playlists.isSuccess && grouped ? (
        <hr className={styles.library__rule} />
      ) : null}
      {playlists.isSuccess && rest.length > 0 ? (
        grouped ? (
          <section aria-labelledby={restHeadingId}>
            <h2 id={restHeadingId} className={styles.library__restTitle}>
              {t('library.rest')}
            </h2>
            {renderList(rest)}
          </section>
        ) : (
          renderList(rest)
        )
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
      {actions.dialogs}
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
