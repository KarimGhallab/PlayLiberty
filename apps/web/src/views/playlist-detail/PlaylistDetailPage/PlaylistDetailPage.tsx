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
 * The screen the product exists for: the only place stored tracks become
 * audible.
 *
 * The left column is the header's card arrangement, not the row the library
 * draws: the card is what fits inside its 320px width. Beneath the card sits one
 * state component and never two, the summary when there is a run and the error
 * when the sync failed.
 *
 * Under 768px the header is the component's row rather than its card, the
 * design's mobile arrangement, where the card would be 470.4px tall against the
 * row's 136px. The way home is drawn at every width; the mobile block only
 * tightens its top padding.
 *
 * The list is drawn in the playlist's own order and every association appears,
 * playable or not, because a track that silently vanished from the list would
 * make "why is this track missing" unanswerable. The play control's presence is
 * the server's file status, the same fact `buildQueue` filters on, so the list
 * and the queue agree by construction.
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
  /* The library read, which is where the writable playlists for the add dialog
   * come from: the dialog adds to several, and this is the list the account can
   * already see. */
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
   * The filter is a view for the visit: it lives here and is never stored, and
   * leaving the screen clears it with the component. It is not applied while the
   * shuffled queue is on screen, so a shuffle shows the whole queue; the choice
   * is kept for when the shuffle is turned off.
   */
  const [trackState, setTrackState] = useState<TrackFileStatus | null>(null);
  /*
   * The route reuses this component as the id changes, so the filter is cleared
   * when the playlist does rather than carried onto the next screen.
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

  /*
   * A row press moves the playhead, and moves it inside the queue the listener
   * is looking at.
   */
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
   * The failure's way out: re-run the press that failed, so a failed shuffle
   * retries as a shuffle rather than silently becoming a plain play.
   */
  const retryPlayback = (): void => {
    void startFrom(
      null,
      failedStart === PlaybackStart.Shuffle,
      failedStart ?? PlaybackStart.Play
    );
  };

  /*
   * Removing a track is deferred the same way as deleting the playlist: the call
   * waits out the window, and the toast's Cancel stops it. The track is named
   * because two rows can read alike and the toast is the only place the removal is
   * still reversible.
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
   * The lane's two actions, stable for the same reason `playTrack` is: each is
   * passed to every row, so a fresh identity would defeat the row's memo.
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
   * The playlists the add dialog may offer: the account's own and any it can
   * write, never a read one, because a playlist it cannot write to is absent
   * rather than disabled. The one being looked at is always in the set when the
   * account can write to it, which is the state this control is drawn in.
   */
  const writablePlaylists = (playlists.data?.items ?? []).filter(
    canWritePlaylist
  );

  /*
   * The refused playlists of the last batch, which is what keeps the dialog open.
   * While a batch has refusals the dialog stays; one with none closes, because an
   * all-success result has nothing to read.
   */
  const refusedOutcomes =
    addTrack.data?.results.filter(entry => entry.outcome === 'refused') ?? [];
  const batchRefused = refusedOutcomes.length > 0;

  /*
   * A batch with no refusals closes the dialog on the settled result, and a fresh
   * open clears the previous one so a stale refusal does not reappear. The reset
   * runs when the dialog opens, so the block is empty until a batch returns.
   */
  useEffect(() => {
    if (addTrack.isSuccess && !batchRefused) {
      setAddOpen(false);
      addTrack.reset();
    }
  }, [addTrack.isSuccess, batchRefused]);

  /*
   * The setting's refusal withdraws itself, on the same window the shuffle notice
   * uses, so a failed change does not stand over the screen once it is read.
   */
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
   * The control row above the list, and what it describes. The chips are the
   * whole-playlist counts the tracks read folds in, so they are drawn only once
   * that read has answered; the row stays while the playlist holds any track,
   * which keeps it on screen under a filter that matched nothing so "Show all"
   * is reachable. The header's count line follows the read's own total, which is
   * the filtered total once a state is asked.
   */
  const counts = tracks.counts;
  const hasTracks = (playlist.data?.trackCount ?? 0) > 0;
  /*
   * A filter that matched nothing. The empty state waits for the filter's own
   * answer rather than reading the previous state's total, which
   * `keepPreviousData` keeps on hand while the next state loads.
   */
  const filterEmpty =
    activeState !== null && !tracks.isPlaceholderData && tracks.total === 0;
  const filterEmptyMessage =
    activeState === null ? null : t(`detail.filterEmpty.${activeState}`);

  /*
   * The in-flight figure the summary draws is the whole playlist's downloading
   * count, which the read folds in as an aggregate, so it does not follow the
   * filter. It is only meaningful while a run is active, which is the only time
   * the summary reads it.
   */
  const downloadingCount = counts?.[TrackFileStatus.Downloading] ?? 0;

  /*
   * A playlist query that answers 404, whether because the playlist does not
   * exist or because the account can no longer see it, is the not-found state
   * and not an error: the header for a playlist that is not there, and a list
   * area with an error sentence, both assert something the server denied. The
   * whole two-column body is replaced, and the state owns one action, back to
   * the library.
   */
  if (playlist.isError) {
    return (
      <main className={styles.playlistDetail}>
        <PlaylistNotFound />
      </main>
    );
  }

  /*
   * The props both header arrangements take. The detail is the one surface that
   * draws both: the card in its left column above 768px and the row below it.
   * They are different modules with different prop surfaces, but every prop the
   * detail passes is honoured by both, so the set is named once and each module
   * is handed it. The card takes no `onOpen` and no sync time, which the detail
   * never passes; the row takes both, and neither is in this set.
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
    /* The count is the rows on screen only once the read has answered; while it
     * is pending the header keeps the playlist's standing total. `countTotal` is
     * that total, narrowed to the filtered total when a chip is in force. */
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
         * The add control is a labelled button in the way-home row above the phone
         * breakpoint and the floating action at it and below, where the row has no
         * second end to hold it: it is the same control the library draws for the
         * same reason, and one of the two is drawn at a time. It is present for the
         * owner and a write collaborator and absent for a read one, the screen's
         * own rule for every control it does not offer a refusal through.
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
                 * `playing` is only read by a current row, so a non-current row
                 * is told `false` rather than the queue's state: the global
                 * `isPlaying` would change every row's props on a play or a
                 * pause and re-render the whole list.
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
