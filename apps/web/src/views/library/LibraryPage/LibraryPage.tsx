import { IconPlus } from '@tabler/icons-react';
import { Fragment, useEffect, useId, useState } from 'react';

import type {
  PlaylistWithCounts,
  TrackFileStatusCounts,
  TrackFilterState
} from '@playliberty/contracts';
import {
  PlaylistSyncStatus,
  Provider,
  REMOTE_REMOVED,
  TrackFileStatus,
  UserRole
} from '@playliberty/contracts';
import type { Messages, Translator } from '@playliberty/i18n';
import { useI18n } from '@playliberty/i18n';

import {
  ownerNameFrom,
  useAccountDirectory,
  useCurrentAccount
} from '../../../shared/api/clients/accountClient/accountClient';
import type { SyncAllOutcome } from '../../../shared/api/clients/libraryClient/libraryClient';
import {
  useCreatePlaylist,
  usePlaylists,
  useSyncAllPlaylists
} from '../../../shared/api/clients/libraryClient/libraryClient';
import { problemSentence } from '../../../shared/api/problem/problem';
import EgressLink from '../../../shared/components/EgressLink/EgressLink';
import FloatingAction from '../../../shared/components/FloatingAction/FloatingAction';
import LanguageMenu from '../../../shared/components/LanguageMenu/LanguageMenu';
import NoticeToast from '../../../shared/components/NoticeToast/NoticeToast';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import SyncControl from '../../../shared/components/SyncControl/SyncControl';
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
import {
  canWritePlaylist,
  usePlaylistActions
} from '../../../shared/playlistActions/playlistActions';
import {
  MOBILE_QUERY,
  useMediaQuery
} from '../../../shared/useMediaQuery/useMediaQuery';

import AddPlaylistDialog from '../AddPlaylistDialog/AddPlaylistDialog';
import EmptyGallery from '../EmptyGallery/EmptyGallery';
import type { LibraryScope } from '../LibraryFilterBar/LibraryFilterBar';
import LibraryFilterBar from '../LibraryFilterBar/LibraryFilterBar';
import LibrarySkeleton from '../LibrarySkeleton/LibrarySkeleton';
import PlaylistItem from '../PlaylistItem';
import styles from './LibraryPage.module.scss';

const TRACK_STATUSES = Object.values(TrackFileStatus);

/* The gallery's status filter reads the scope it is drawn over: one total per
 * status over every playlist in that scope, with the retained figure beside the
 * five buckets. */
function scopeTotals(items: readonly PlaylistWithCounts[]): {
  readonly counts: TrackFileStatusCounts;
  readonly remoteRemoved: number;
} {
  const counts: TrackFileStatusCounts = {
    [TrackFileStatus.Stored]: 0,
    [TrackFileStatus.Pending]: 0,
    [TrackFileStatus.Downloading]: 0,
    [TrackFileStatus.Failed]: 0,
    [TrackFileStatus.Unavailable]: 0
  };
  let remoteRemoved = 0;

  for (const item of items) {
    for (const status of TRACK_STATUSES) {
      counts[status] += item.counts[status];
    }

    remoteRemoved += item.remoteRemoved;
  }

  return { counts, remoteRemoved };
}

/*
 * The batch notice names the tally, and the refusal that ended the loop when
 * one did. A stop is the louder fact: the count alone would read as success.
 */
function syncAllNoticeFor(
  t: Translator<Messages>,
  outcome: SyncAllOutcome
): { readonly message: string; readonly detail: string | null } {
  if (outcome.stopped !== null) {
    return {
      message: t('library.syncAllStopped'),
      detail: problemSentence(t, outcome.stopped)
    };
  }

  if (outcome.started === 0) {
    return {
      message: t('library.syncAllNone', { count: outcome.alreadyRunning }),
      detail: null
    };
  }

  return {
    message: t('library.syncAllStarted', { count: outcome.started }),
    detail:
      outcome.alreadyRunning === 0
        ? null
        : t('library.syncAllRunning', { count: outcome.alreadyRunning })
  };
}

/*
 * Four states and no fifth: loading, failure, the empty gallery, the list. Each
 * delete opens its own undo window, so a second one stacks rather than replaces.
 */
export default function LibraryPage() {
  const { t } = useI18n();
  const playlists = usePlaylists();
  const directory = useAccountDirectory();
  const me = useCurrentAccount();
  const createPlaylist = useCreatePlaylist();
  const syncAll = useSyncAllPlaylists();
  const deferred = useDeferredAction();
  const { play, shuffle, refusal, startingPress } = usePlayTransition();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const docked = usePlayerStore(state => currentTrack(state) !== null);
  const [scope, setScope] = useState<LibraryScope>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pinRefused, setPinRefused] = useState<Error | null>(null);
  const [syncAllNotice, setSyncAllNotice] = useState<SyncAllOutcome | null>(
    null
  );
  const [batch, setBatch] = useState<{
    readonly ids: readonly string[];
    readonly at: number;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<TrackFilterState | null>(
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
  const sharedItems = items.filter(playlist => playlist.access !== 'owner');
  const hasShared = sharedItems.length > 0;
  const scopedItems = scope === 'shared' ? sharedItems : items;
  const { counts: statusCounts, remoteRemoved } = scopeTotals(scopedItems);
  const hasStatusCounts = TRACK_STATUSES.some(
    status => statusCounts[status] > 0
  );
  const activeCount =
    statusFilter === null
      ? 0
      : statusFilter === REMOTE_REMOVED
        ? remoteRemoved
        : statusCounts[statusFilter];
  const provider = scopedItems[0]?.provider ?? Provider.Youtube;

  /*
   * A status the scope no longer carries cannot stay in force; a live read
   * that drops the last track in it returns the status rail to All.
   */
  useEffect(() => {
    if (statusFilter !== null && activeCount === 0) {
      setStatusFilter(null);
    }
  }, [statusFilter, activeCount]);

  /* The scope cannot outlive the last share: its pair leaves the rail. */
  useEffect(() => {
    if (scope === 'shared' && !hasShared) {
      setScope('all');
    }
  }, [scope, hasShared]);

  const visibleItems =
    statusFilter === null
      ? scopedItems
      : statusFilter === REMOTE_REMOVED
        ? scopedItems.filter(playlist => playlist.remoteRemoved > 0)
        : scopedItems.filter(playlist => playlist.counts[statusFilter] > 0);

  /*
   * The bulk sync covers what the filters show and the account can write, less
   * what is already running; this array is the set a press freezes.
   */
  const syncable = visibleItems.filter(
    playlist =>
      canWritePlaylist(playlist) &&
      playlist.syncStatus !== PlaylistSyncStatus.Syncing
  );

  /*
   * The batch a press started, held until a list read taken after it settles
   * shows none of its playlists running. Without it the control unmounts the
   * moment the last `202` returns, because every playlist it started is already
   * `syncing` by then, and the words would flip back for the couple of frames
   * between the loop ending and that read landing.
   */
  const batchSyncing =
    batch !== null &&
    batch.ids.some(id =>
      items.some(
        playlist =>
          playlist.id === id &&
          playlist.syncStatus === PlaylistSyncStatus.Syncing
      )
    );
  const batchBusy =
    batch !== null &&
    (syncAll.isPending || batchSyncing || playlists.dataUpdatedAt <= batch.at);

  const syncAllCount = batchBusy ? batch.ids.length : syncable.length;

  const startSyncAll = (): void => {
    const ids = syncable.map(playlist => playlist.id);

    setBatch({ ids, at: playlists.dataUpdatedAt });
    syncAll.mutate(ids, { onSuccess: setSyncAllNotice });
  };

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

  /* The batch notice withdraws on the window the other notices use. */
  useEffect(() => {
    if (syncAllNotice === null) {
      return;
    }

    const timer = setTimeout(() => setSyncAllNotice(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [syncAllNotice]);

  /*
   * The batch ends on a read taken after it settled that finds none of it
   * running, so a read still in flight cannot end it early.
   */
  useEffect(() => {
    if (batch === null || syncAll.isPending) {
      return;
    }

    if (playlists.dataUpdatedAt <= batch.at || batchSyncing) {
      return;
    }

    setBatch(null);
  }, [batch, syncAll.isPending, batchSyncing, playlists.dataUpdatedAt]);

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
          {me.data?.role === UserRole.Admin ? <EgressLink /> : null}
          <LanguageMenu />
          {syncAllCount === 0 ? null : (
            <SyncControl
              label={
                isMobile
                  ? t('library.syncAllShort')
                  : t('library.syncAll', { count: syncAllCount })
              }
              visibleLabel={isMobile ? t('library.syncAllShort') : undefined}
              workingLabel={t('library.syncingAll', { count: syncAllCount })}
              working={batchBusy}
              onPress={startSyncAll}
            />
          )}
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
      {playlists.isSuccess &&
      items.length > 0 &&
      (hasShared || hasStatusCounts) ? (
        <LibraryFilterBar
          hasShared={hasShared}
          totalCount={items.length}
          sharedCount={sharedItems.length}
          scope={scope}
          onScopeChange={setScope}
          counts={statusCounts}
          remoteRemoved={remoteRemoved}
          provider={provider}
          showStatus={hasStatusCounts}
          activeStatus={statusFilter}
          onStatusChange={setStatusFilter}
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
      {syncAllNotice === null ? null : (
        <NoticeToast
          {...syncAllNoticeFor(t, syncAllNotice)}
          durationMs={NOTICE_WINDOW_MS}
        />
      )}
    </main>
  );
}
