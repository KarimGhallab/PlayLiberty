import { IconPlus } from '@tabler/icons-react';
import { Fragment, useEffect, useId, useState } from 'react';

import { PlaylistSyncStatus, TrackFileStatus } from '@playliberty/contracts';
import type {
  PlaylistWithCounts,
  TrackFileStatusCounts
} from '@playliberty/contracts';
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
import PlaylistFilterChips from '../../../shared/components/PlaylistFilterChips/PlaylistFilterChips';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import { useDeferredAction } from '../../../shared/components/useDeferredAction/useDeferredAction';
import { usePlayerStore } from '../../../shared/player/playerStore/playerStore';
import { currentTrack } from '../../../shared/player/types';
import {
  NOTICE_WINDOW_MS,
  StartIntent,
  pressForPlaylist,
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

const TRACK_STATUSES = Object.values(TrackFileStatus);

/* The gallery's status filter reads the whole library: one total per status
 * over every playlist's counts. */
function totalStatusCounts(
  items: readonly PlaylistWithCounts[]
): TrackFileStatusCounts {
  const totals: TrackFileStatusCounts = {
    [TrackFileStatus.Stored]: 0,
    [TrackFileStatus.Pending]: 0,
    [TrackFileStatus.Downloading]: 0,
    [TrackFileStatus.Failed]: 0,
    [TrackFileStatus.Unavailable]: 0
  };

  for (const item of items) {
    for (const status of TRACK_STATUSES) {
      totals[status] += item.counts[status];
    }
  }

  return totals;
}

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
  const { play, shuffle, refusal, startingPress } = usePlayTransition();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const docked = usePlayerStore(state => currentTrack(state) !== null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pinRefused, setPinRefused] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<TrackFileStatus | null>(
    null
  );
  const pinnedHeadingId = useId();
  const syncingHeadingId = useId();
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
  const statusCounts = totalStatusCounts(items);
  const hasStatusCounts = TRACK_STATUSES.some(
    status => statusCounts[status] > 0
  );
  const activeCount = statusFilter === null ? 0 : statusCounts[statusFilter];

  /*
   * A status the library no longer carries cannot stay in force; a live read
   * that drops the last track in it returns the gallery to All.
   */
  useEffect(() => {
    if (statusFilter !== null && activeCount === 0) {
      setStatusFilter(null);
    }
  }, [statusFilter, activeCount]);

  const visibleItems =
    statusFilter === null
      ? items
      : items.filter(playlist => playlist.counts[statusFilter] > 0);

  /*
   * The page filters and never sorts, so every group keeps the server's order.
   * A pin outranks a running first sync, so the transient group holds the
   * unpinned rows only.
   */
  const pinned = visibleItems.filter(playlist => playlist.pinned);
  const unpinned = visibleItems.filter(playlist => !playlist.pinned);
  const syncing = unpinned.filter(
    playlist => playlist.syncStatus === PlaylistSyncStatus.Syncing
  );
  const rest = unpinned.filter(
    playlist => playlist.syncStatus !== PlaylistSyncStatus.Syncing
  );

  const groups: readonly {
    readonly key: string;
    readonly heading: string | null;
    readonly headingId: string | null;
    readonly items: readonly PlaylistWithCounts[];
  }[] = [
    {
      key: 'pinned',
      heading: t('library.pinned'),
      headingId: pinnedHeadingId,
      items: pinned
    },
    {
      key: 'syncing',
      heading: t('library.syncing'),
      headingId: syncingHeadingId,
      items: syncing
    },
    { key: 'rest', heading: null, headingId: null, items: rest }
  ];
  const drawnGroups = groups.filter(group => group.items.length > 0);

  const isEmpty = playlists.isSuccess && items.length === 0;

  /* The refusal withdraws on the window the other notices use. */
  useEffect(() => {
    if (pinRefused === null) {
      return;
    }

    const timer = setTimeout(() => setPinRefused(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [pinRefused]);

  const renderItem = (playlist: PlaylistWithCounts) => {
    const startingThisPlaylist = pressForPlaylist(startingPress, playlist.id);

    return (
      <li key={playlist.id} className={styles.library__cell}>
        <PlaylistItem
          playlist={playlist}
          ownerName={ownerNameFrom(directoryItems, playlist.ownerAccountId)}
          pending={deferred.windows.some(entry => entry.id === playlist.id)}
          layout={isMobile ? 'card' : 'tile'}
          menu={actions.menuFor(playlist)}
          onPlay={() => play(playlist)}
          onShuffle={() => shuffle(playlist)}
          playbackStarting={startingThisPlaylist !== null}
          startingControl={
            startingThisPlaylist?.intent === StartIntent.Shuffle
              ? 'shuffle'
              : 'play'
          }
        />{' '}
      </li>
    );
  };

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
      {playlists.isSuccess && items.length > 0 && hasStatusCounts ? (
        <PlaylistFilterChips
          counts={statusCounts}
          active={statusFilter}
          showEmpty={false}
          onChange={setStatusFilter}
        />
      ) : null}
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
      {playlists.isSuccess
        ? drawnGroups.map((group, index) => (
            <Fragment key={group.key}>
              {/* A boundary needs two sides, so a lone group sees no rule. */}
              {index > 0 ? <hr className={styles.library__rule} /> : null}
              {group.heading === null || group.headingId === null ? (
                renderList(group.items)
              ) : (
                <section aria-labelledby={group.headingId}>
                  <h2
                    id={group.headingId}
                    className={styles.library__sectionTitle}>
                    {group.heading}
                  </h2>
                  {renderList(group.items)}
                </section>
              )}
            </Fragment>
          ))
        : null}
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
