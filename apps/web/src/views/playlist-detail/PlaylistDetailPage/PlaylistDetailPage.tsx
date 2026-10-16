import { IconChevronLeft, IconPlus } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';

import {
  PlaylistSort,
  PlaylistSyncStatus,
  Provider,
  TrackFileStatus
} from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import { problemSentence } from '../../../shared/api/problem/problem';
import {
  fetchPlaylistQueue,
  ownerNameFrom,
  playlistQueueKey,
  useAccountDirectory,
  useAddTrack,
  useFetchTrackWhole,
  useLatestSyncRun,
  usePlaylist,
  usePlaylistQueue,
  usePlaylistTracks,
  usePlaylists,
  useRemoveTrack,
  useRetryTrack,
  useUpdateSkipNonMusic,
  useUpdateSort
} from '../../../shared/api/queries/queries';
import AddTrackDialog from '../../../shared/components/AddTrackDialog/AddTrackDialog';
import EmptyState from '../../../shared/components/EmptyState/EmptyState';
import FloatingAction from '../../../shared/components/FloatingAction/FloatingAction';
import LoadMoreControl from '../../../shared/components/LoadMoreControl/LoadMoreControl';
import NoticeToast from '../../../shared/components/NoticeToast/NoticeToast';
import PlaylistFilterChips from '../../../shared/components/PlaylistFilterChips/PlaylistFilterChips';
import PlaylistCardHeader from '../../../shared/components/PlaylistHeader/PlaylistCardHeader';
import PlaylistRowHeader from '../../../shared/components/PlaylistHeader/PlaylistRowHeader';
import PlaylistNotFound from '../../../shared/components/PlaylistNotFound/PlaylistNotFound';
import PlaylistSkipSetting from '../../../shared/components/PlaylistSkipSetting/PlaylistSkipSetting';
import PlaylistSortControl from '../../../shared/components/PlaylistSortControl/PlaylistSortControl';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import SyncError from '../../../shared/components/SyncError/SyncError';
import SyncSummary from '../../../shared/components/SyncSummary/SyncSummary';
import TrackRow from '../../../shared/components/TrackRow/TrackRow';
import UndoToast from '../../../shared/components/UndoToast/UndoToast';
import {
  UNDO_WINDOW_MS,
  useDeferredAction
} from '../../../shared/components/useDeferredAction/useDeferredAction';
import { startPlaylistQueue } from '../../../shared/player/playerQueue/playerQueue';
import { useQueueRefetch } from '../../../shared/player/playerQueue/useQueueRefetch';
import { usePlayerStore } from '../../../shared/player/playerStore/playerStore';
import { orderTracksByQueue } from '../../../shared/player/queueOrder/queueOrder';
import {
  currentTrack,
  hasNext,
  queuePlaylistId
} from '../../../shared/player/types';
import {
  NOTICE_WINDOW_MS,
  refusalNotice,
  useStartPlaylist
} from '../../../shared/player/useStartPlaylist/useStartPlaylist';
import {
  canWritePlaylist,
  usePlaylistActions
} from '../../../shared/playlistActions/playlistActions';
import {
  MOBILE_QUERY,
  useMediaQuery
} from '../../../shared/useMediaQuery/useMediaQuery';

import styles from './PlaylistDetailPage.module.scss';

/*
 * Every association is drawn, playable or not: a vanished track would make
 * "why is this missing" unanswerable. The play control is the server's file
 * status, the same fact the queue build filters on.
 */
enum PlaybackStart {
  Play = 'play',
  Shuffle = 'shuffle'
}

export default function PlaylistDetailPage() {
  const { t } = useI18n();
  const { playlistId } = useParams({ from: '/playlists/$playlistId' });
  const navigate = useNavigate();
  const playlist = usePlaylist(playlistId);
  const latestRun = useLatestSyncRun(playlistId);
  const directory = useAccountDirectory();
  /* The library read: the add dialog's writable playlists come from here. */
  const playlists = usePlaylists();
  const retry = useRetryTrack(playlistId);
  const fetchWhole = useFetchTrackWhole(playlistId);
  const removeTrack = useRemoveTrack(playlistId);
  const updateSkip = useUpdateSkipNonMusic(playlistId);
  const updateSort = useUpdateSort(playlistId);
  const addTrack = useAddTrack();
  const [addOpen, setAddOpen] = useState(false);
  const [settingRefused, setSettingRefused] = useState<string | null>(null);
  const [failedStart, setFailedStart] = useState<PlaybackStart | null>(null);
  const [starting, setStarting] = useState(false);
  const deferred = useDeferredAction();
  const queryClient = useQueryClient();

  const actions = usePlaylistActions(playlistId, playlist.data, {
    defer: deferred.defer,
    deleteMessage: 'detail.deleteDeferred',
    onDeleted: () => {
      void navigate({ to: '/' });
    }
  });
  /* The card and the row are different modules rather than two stylesheets, so
   * the viewport decides which is drawn rather than CSS. */
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const docked = usePlayerStore(state => currentTrack(state) !== null);
  const setPlaying = usePlayerStore(state => state.setPlaying);
  const skipNext = usePlayerStore(state => state.skipNext);
  const skipPrevious = usePlayerStore(state => state.skipPrevious);
  const currentId = usePlayerStore(state => state.currentId);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const shuffled = usePlayerStore(state => state.shuffle);
  const queue = usePlayerStore(state => state.queue);
  const { shufflePlaylist, refusal } = useStartPlaylist();
  const playingPlaylistId = usePlayerStore(queuePlaylistId);
  const isQueue = playingPlaylistId === playlistId;
  /* The list draws the shuffled queue's own order while this playlist is the
   * queue, which is also when the filter and the sort step aside. */
  const listShuffled = shuffled && isQueue;
  /*
   * The filter lasts for the visit only, and is not applied while the shuffled
   * queue is on screen; the choice survives until the shuffle is turned off.
   */
  const [trackState, setTrackState] = useState<TrackFileStatus | null>(null);
  /*
   * The route reuses this component across ids, so the filter is cleared with
   * the playlist rather than carried onto the next screen.
   */
  useEffect(() => {
    setTrackState(null);
  }, [playlistId]);
  const activeState = listShuffled ? null : trackState;
  const tracks = usePlaylistTracks(playlistId, activeState ?? undefined);
  const queueRead = usePlaylistQueue(playlistId, isQueue);
  useQueueRefetch(playlist.data, queueRead.data);
  /* The queue's own derivation, so a shuffled queue goes dead at its last entry
   * exactly as an unshuffled one does. */
  const canSkipNext = usePlayerStore(hasNext);

  const ownerName =
    playlist.data !== undefined && directory.data !== undefined
      ? ownerNameFrom(directory.data, playlist.data.ownerAccountId)
      : null;

  const startFrom = useCallback(
    async (
      startTrackId: string | null,
      shuffle: boolean,
      intent: PlaybackStart
    ): Promise<void> => {
      const view = playlist.data;

      if (view === undefined) {
        return;
      }

      setStarting(true);
      setFailedStart(null);

      try {
        const full = await queryClient.query({
          queryKey: playlistQueueKey(playlistId),
          queryFn: () => fetchPlaylistQueue(playlistId)
        });

        startPlaylistQueue(view, full, startTrackId, shuffle);
      } catch {
        setFailedStart(intent);
      } finally {
        setStarting(false);
      }
    },
    [playlistId, playlist.data, queryClient]
  );

  /* A row press moves the playhead inside the queue the listener sees. */
  const playTrack = useCallback(
    (trackId: string): void => {
      const player = usePlayerStore.getState();

      if (trackId === player.currentId) {
        player.setPlaying(!player.isPlaying);
        return;
      }

      if (queuePlaylistId(player) === playlistId) {
        player.play(trackId);
        return;
      }

      void startFrom(trackId, false, PlaybackStart.Play);
    },
    [playlistId, startFrom]
  );

  const playPlaylist = (): void => {
    if (playingPlaylistId === playlistId) {
      setPlaying(!isPlaying);
      return;
    }

    void startFrom(null, shuffled, PlaybackStart.Play);
  };

  /*
   * Re-run the press that failed, so a failed shuffle retries as a shuffle
   * rather than silently becoming a plain play.
   */
  const retryPlayback = (): void => {
    void startFrom(
      null,
      failedStart === PlaybackStart.Shuffle,
      failedStart ?? PlaybackStart.Play
    );
  };

  /*
   * Deferred like the playlist delete: the toast's Cancel is the only place a
   * removal is still reversible, so the track is named in it.
   */
  const removeTrackDeferred = useCallback(
    (trackId: string): void => {
      const title =
        tracks.tracks.find(association => association.track.id === trackId)
          ?.track.title ?? t('detail.trackFallback');

      deferred.defer({
        id: trackId,
        message: t('detail.removeDeferred'),
        detail: title,
        commit: () => removeTrack.mutate(trackId)
      });
    },
    [t, tracks.tracks, deferred.defer, removeTrack.mutate]
  );

  /*
   * Stable identities, as `playTrack` is: each is passed to every row, so a
   * fresh identity would defeat the row's memo.
   */
  const retryTrack = useCallback(
    (trackId: string): void => retry.mutate(trackId),
    [retry.mutate]
  );
  const fetchWholeTrack = useCallback(
    (trackId: string): void => fetchWhole.mutate(trackId),
    [fetchWhole.mutate]
  );

  const canWrite = actions.canWrite;
  /* The one track whose row action is in flight, so its menu is not opened onto
   * a second press while the first is still running. */
  const busyTrackId = retry.isPending
    ? retry.variables
    : fetchWhole.isPending
      ? fetchWhole.variables
      : undefined;
  const neverSynced = playlist.data?.lastSyncedAt === null;

  /*
   * The account's own playlists and any it can write, never a read one: an
   * unwritable playlist is absent rather than disabled.
   */
  const writablePlaylists = (playlists.data?.items ?? []).filter(
    canWritePlaylist
  );

  const refusedOutcomes =
    addTrack.data?.results.filter(entry => entry.outcome === 'refused') ?? [];
  const batchRefused = refusedOutcomes.length > 0;

  /*
   * A settled batch with no refusals closes the dialog; the reset clears a
   * stale refusal before the next open.
   */
  useEffect(() => {
    if (addTrack.isSuccess && !batchRefused) {
      setAddOpen(false);
      addTrack.reset();
    }
  }, [addTrack.isSuccess, batchRefused]);

  /* The refusal withdraws on the window the shuffle notice uses. */
  useEffect(() => {
    if (settingRefused === null) {
      return;
    }

    const timer = setTimeout(() => setSettingRefused(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [settingRefused]);
  const failed = playlist.data?.syncStatus === PlaylistSyncStatus.Error;
  const playlistPending = deferred.pending?.id === playlistId;
  const playingThis = isPlaying && isQueue;

  /*
   * The chips are the whole-playlist counts the read folds in, drawn only once
   * it has answered; the row survives an empty filter to keep "Show all".
   */
  const counts = tracks.counts;
  const hasTracks = (playlist.data?.trackCount ?? 0) > 0;
  /*
   * The empty state waits for the filter's own answer: `keepPreviousData` keeps
   * the previous total on hand while the next state loads.
   */
  const filterEmpty =
    activeState !== null && !tracks.isPlaceholderData && tracks.total === 0;
  const filterEmptyMessage =
    activeState === null ? null : t(`detail.filterEmpty.${activeState}`);

  /*
   * The whole playlist's downloading count, an aggregate the read folds in, so
   * it does not follow the filter.
   */
  const downloadingCount = counts?.[TrackFileStatus.Downloading] ?? 0;

  /*
   * A 404, whether the playlist is gone or no longer visible, is the not-found
   * state rather than an error: the whole body is replaced by the way back.
   */
  if (playlist.isError) {
    return (
      <main className={styles.playlistDetail}>
        <PlaylistNotFound />
      </main>
    );
  }

  /*
   * Every prop here is honoured by both header arrangements, the card above
   * 768px and the row below it, so the set is named once.
   */
  const headerProps = {
    ownerName,
    heading: true,
    ground: true,
    onPlay: playPlaylist,
    playing: playingThis,
    current: isQueue,
    pending: playlistPending,
    onSkipBack: skipPrevious,
    onSkipNext: skipNext,
    hasNext: canSkipNext,
    onShuffle: () =>
      shufflePlaylist(
        {
          id: playlistId,
          name: playlist.data?.name ?? 'This playlist'
        },
        { onUnreachable: () => setFailedStart(PlaybackStart.Shuffle) }
      ),
    shuffled,
    menu: actions.menu,
    /* The rows on screen once the read has answered, the standing total until
     * then. */
    displayedCount: tracks.isSuccess ? tracks.tracks.length : undefined,
    countTotal: tracks.total ?? playlist.data?.trackCount,
    playbackFailed: failedStart !== null,
    playbackStarting: starting,
    onRetryPlayback: retryPlayback
  };

  return (
    <main
      className={styles.playlistDetail}
      data-player={docked ? 'true' : undefined}>
      <nav className={styles.playlistDetail__wayhome}>
        <Link to="/" className={styles.playlistDetail__back}>
          <IconChevronLeft
            className={styles.playlistDetail__backIcon}
            aria-hidden="true"
            focusable="false"
          />
          {t('detail.back')}
        </Link>
        {/*
         * The labelled button above the phone breakpoint, the floating action
         * below it, one at a time; absent for a reader, like any control.
         */}
        {canWrite && !isMobile ? (
          <button
            type="button"
            className={styles.playlistDetail__add}
            onClick={() => {
              addTrack.reset();
              setAddOpen(true);
            }}>
            <IconPlus
              className={styles.playlistDetail__addIcon}
              aria-hidden="true"
              focusable="false"
            />
            {t('detail.addTrack')}
          </button>
        ) : null}
      </nav>

      {canWrite && isMobile ? (
        <FloatingAction
          label={t('detail.addTrack')}
          onClick={() => {
            addTrack.reset();
            setAddOpen(true);
          }}
        />
      ) : null}

      <div className={styles.playlistDetail__columns}>
        <div className={styles.playlistDetail__left}>
          <div className={styles.playlistDetail__header}>
            {playlist.isSuccess ? (
              isMobile ? (
                <PlaylistRowHeader {...headerProps} playlist={playlist.data} />
              ) : (
                <PlaylistCardHeader {...headerProps} playlist={playlist.data} />
              )
            ) : null}
            {failedStart === null ? null : (
              <p
                className={styles.playlistDetail__playbackFailed}
                role="status">
                {t('detail.playbackFailed')}
              </p>
            )}
          </div>

          <div className={styles.playlistDetail__side}>
            {playlist.isSuccess ? (
              <PlaylistSkipSetting
                skipNonMusic={playlist.data.skipNonMusic}
                canEdit={canWrite}
                saving={updateSkip.isPending}
                onChange={value =>
                  updateSkip.mutate(value, {
                    onError: error =>
                      setSettingRefused(
                        problemSentence(t, error) ?? t('detail.settingFailed')
                      )
                  })
                }
              />
            ) : null}

            {failed && latestRun.isSuccess ? (
              <div className={styles.playlistDetail__state}>
                <SyncError
                  trackCount={playlist.data?.trackCount ?? null}
                  provider={playlist.data?.provider ?? Provider.Youtube}
                  rawError={latestRun.data?.error ?? null}
                  onRetry={canWrite ? actions.syncNow : undefined}
                  retrying={actions.syncing}
                />
              </div>
            ) : null}

            {!failed &&
            latestRun.data !== null &&
            latestRun.data !== undefined ? (
              <div className={styles.playlistDetail__state}>
                <SyncSummary
                  run={latestRun.data}
                  now={new Date()}
                  downloadingCount={downloadingCount}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.playlistDetail__tracks}>
          {tracks.isPending ? (
            <p className={styles.playlistDetail__note}>
              {t('detail.loadingTracks')}
            </p>
          ) : null}
          {tracks.isError ? (
            <ReadFailure
              message={t('detail.readFailed')}
              error={tracks.error}
              onRetry={tracks.retry}
              retrying={tracks.retrying}
            />
          ) : null}
          {tracks.isSuccess && counts !== undefined && hasTracks ? (
            <div className={styles.playlistDetail__controls}>
              <PlaylistFilterChips
                counts={counts}
                active={activeState}
                disabled={listShuffled}
                onChange={setTrackState}
              />
              <PlaylistSortControl
                sort={playlist.data?.sort ?? PlaylistSort.Playlist}
                canEdit={canWrite}
                shuffled={listShuffled}
                saving={updateSort.isPending}
                onChange={value =>
                  updateSort.mutate(value, {
                    onError: error =>
                      setSettingRefused(
                        problemSentence(t, error) ?? t('detail.settingFailed')
                      )
                  })
                }
              />
            </div>
          ) : null}
          {neverSynced && tracks.isSuccess && !hasTracks ? (
            <EmptyState
              onSync={canWrite ? actions.syncNow : undefined}
              syncing={actions.syncing}
            />
          ) : null}
          {!neverSynced && tracks.isSuccess && !hasTracks ? (
            <p className={styles.playlistDetail__note}>
              {t('detail.noTracks')}
            </p>
          ) : null}
          {tracks.isSuccess &&
          hasTracks &&
          filterEmpty &&
          filterEmptyMessage !== null ? (
            <div className={styles.playlistDetail__filterEmpty} role="status">
              <p className={styles.playlistDetail__filterEmptyText}>
                {filterEmptyMessage}
              </p>
              <button
                type="button"
                className={styles.playlistDetail__filterReset}
                onClick={() => setTrackState(null)}>
                {t('detail.filterShowAll')}
              </button>
            </div>
          ) : null}
          {tracks.isSuccess && tracks.tracks.length > 0 ? (
            <ul className={styles.playlistDetail__list}>
              {(listShuffled
                ? orderTracksByQueue(tracks.tracks, queue)
                : tracks.tracks
              ).map(association => {
                /*
                 * A non-current row is told `playing: false`; the global
                 * `isPlaying` would re-render every row on a play or a pause.
                 */
                const isCurrent = association.track.id === currentId;

                return (
                  <TrackRow
                    key={association.track.id}
                    association={association}
                    current={isCurrent}
                    playing={isCurrent && isPlaying}
                    pending={
                      playlistPending ||
                      deferred.pending?.id === association.track.id
                    }
                    onPlay={playTrack}
                    onRetry={canWrite ? retryTrack : undefined}
                    onFetchWhole={canWrite ? fetchWholeTrack : undefined}
                    onRemove={canWrite ? removeTrackDeferred : undefined}
                    busy={busyTrackId === association.track.id}
                  />
                );
              })}
            </ul>
          ) : null}
          {tracks.isSuccess && tracks.hasMore ? (
            <LoadMoreControl
              loading={tracks.loadingMore}
              failed={tracks.moreFailed}
              onLoadMore={tracks.loadMore}
            />
          ) : null}
        </div>
      </div>

      {actions.dialogs}

      <AddTrackDialog
        open={addOpen}
        currentPlaylistId={playlistId}
        playlists={writablePlaylists}
        isWorking={addTrack.isPending}
        result={addTrack.data ?? null}
        problem={addTrack.isError ? problemSentence(t, addTrack.error) : null}
        onSubmit={(url, playlistIds) => addTrack.mutate({ url, playlistIds })}
        onClose={() => {
          setAddOpen(false);
          addTrack.reset();
        }}
      />

      {deferred.pending !== null ? (
        <UndoToast
          message={deferred.pending.message}
          detail={deferred.pending.detail}
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
      {settingRefused === null ? null : (
        <NoticeToast
          message={t('detail.settingNotice')}
          detail={settingRefused}
          durationMs={NOTICE_WINDOW_MS}
        />
      )}
    </main>
  );
}
