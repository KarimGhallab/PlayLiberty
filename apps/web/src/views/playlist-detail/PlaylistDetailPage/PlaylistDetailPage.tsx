import { IconChevronLeft, IconPlus } from '@tabler/icons-react';
import {
  Link,
  useNavigate,
  useParams,
  useRouter,
  useSearch
} from '@tanstack/react-router';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { flushSync } from 'react-dom';

import {
  ApiError,
  ownerNameFrom,
  useAccountDirectory,
  useAddTrack,
  useCancelSyncPlaylist,
  useCurrentAccount,
  useFetchTrackWhole,
  useLatestSyncRun,
  usePlaylist,
  usePlaylistQueue,
  usePlaylistTracks,
  usePlaylists,
  useRemoveTrack,
  useRetryFailedTracks,
  useRetryTrack,
  useUpdateSkipNonMusic,
  useUpdateSort
} from '@playliberty/api-client';
import type { TrackFilterState } from '@playliberty/contracts';
import {
  PlaylistSort,
  PlaylistSyncStatus,
  Provider,
  REMOTE_REMOVED,
  SyncRunStatus,
  TrackFileStatus,
  UserRole
} from '@playliberty/contracts';
import type { TrackLinkNotice } from '@playliberty/i18n';
import { cannotPlayNotice, providerLabel, useI18n } from '@playliberty/i18n';
import { canWritePlaylist } from '@playliberty/library';
import {
  hasPlayableTrack,
  isPlayable,
  orderTracksByQueue
} from '@playliberty/player';

import { problemSentence } from '../../../shared/api/problem/problem';
import AddTrackDialog from '../../../shared/components/AddTrackDialog/AddTrackDialog';
import EgressLink from '../../../shared/components/EgressLink/EgressLink';
import EmptyState from '../../../shared/components/EmptyState/EmptyState';
import FloatingAction from '../../../shared/components/FloatingAction/FloatingAction';
import LanguageMenu from '../../../shared/components/LanguageMenu/LanguageMenu';
import LoadMoreControl from '../../../shared/components/LoadMoreControl/LoadMoreControl';
import NoticeToast from '../../../shared/components/NoticeToast/NoticeToast';
import PlaylistFilterChips from '../../../shared/components/PlaylistFilterChips/PlaylistFilterChips';
import PlaylistCardHeader from '../../../shared/components/PlaylistHeader/PlaylistCardHeader';
import PlaylistRowHeader from '../../../shared/components/PlaylistHeader/PlaylistRowHeader';
import type { PlaylistHeaderSeam } from '../../../shared/components/PlaylistHeader/usePlaylistHeader';
import PlaylistNotFound from '../../../shared/components/PlaylistNotFound/PlaylistNotFound';
import PlaylistSkipSetting from '../../../shared/components/PlaylistSkipSetting/PlaylistSkipSetting';
import PlaylistSortControl from '../../../shared/components/PlaylistSortControl/PlaylistSortControl';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import RetryFailedControl from '../../../shared/components/RetryFailedControl/RetryFailedControl';
import SyncControl from '../../../shared/components/SyncControl/SyncControl';
import SyncError from '../../../shared/components/SyncError/SyncError';
import SyncSummary from '../../../shared/components/SyncSummary/SyncSummary';
import ErrorToast from '../../../shared/components/Toast/ErrorToast';
import SuccessToast from '../../../shared/components/Toast/SuccessToast';
import ToastStack from '../../../shared/components/Toast/ToastStack';
import TrackRow from '../../../shared/components/TrackRow/TrackRow';
import { useDeferredAction } from '../../../shared/components/useDeferredAction/useDeferredAction';
import { useQueueRefetch } from '../../../shared/player/playerQueue/useQueueRefetch/useQueueRefetch';
import { usePlayerStore } from '../../../shared/player/playerStore/playerStore';
import {
  currentTrack,
  hasNext,
  queuePlaylistId
} from '../../../shared/player/types';
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

import styles from './PlaylistDetailPage.module.scss';
import TrackListSkeleton from './TrackListSkeleton/TrackListSkeleton';

/* Every association is drawn, playable or not: a vanished track would make
 * "why is this missing" unanswerable. */

/*
 * A list this long swaps its order slower than a frame, so the skeleton stands
 * in front of the exchange; a shorter one lands before the skeleton could paint.
 */
const REORDER_HOLD_ROWS = 50;

/** The result of the row's copy, which chooses the toast. */
enum CopyLinkResult {
  Copied = 'copied',
  Failed = 'failed'
}

export default function PlaylistDetailPage() {
  const { t } = useI18n();
  const { playlistId } = useParams({ from: '/playlists/$playlistId' });
  const { track: trackParam = null } = useSearch({
    from: '/playlists/$playlistId'
  });
  const navigate = useNavigate();
  const router = useRouter();
  const playlist = usePlaylist(playlistId);
  const latestRun = useLatestSyncRun(playlistId);
  const directory = useAccountDirectory();
  /* The reader's own role: the egress door is admin-only on both surfaces. */
  const me = useCurrentAccount();
  /* The library read: the add dialog's writable playlists come from here. */
  const playlists = usePlaylists();
  const retry = useRetryTrack(playlistId);
  const retryAllFailed = useRetryFailedTracks(playlistId);
  const fetchWhole = useFetchTrackWhole(playlistId);
  const removeTrack = useRemoveTrack(playlistId);
  const updateSkip = useUpdateSkipNonMusic(playlistId);
  const updateSort = useUpdateSort(playlistId);
  const addTrack = useAddTrack();
  const cancelSync = useCancelSyncPlaylist();
  const [addOpen, setAddOpen] = useState(false);
  const [settingRefused, setSettingRefused] = useState<string | null>(null);
  const [cancelRefused, setCancelRefused] = useState<{
    readonly detail: string | null;
  } | null>(null);
  const [copyResult, setCopyResult] = useState<CopyLinkResult | null>(null);
  const [linkNotice, setLinkNotice] = useState<TrackLinkNotice | null>(null);
  const deferred = useDeferredAction();

  const actions = usePlaylistActions({
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
  const skipNext = usePlayerStore(state => state.skipNext);
  const skipPrevious = usePlayerStore(state => state.skipPrevious);
  const currentId = usePlayerStore(state => state.currentId);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const shuffled = usePlayerStore(state => state.shuffle);
  const queue = usePlayerStore(state => state.queue);
  const transition = usePlayTransition();
  const playingPlaylistId = usePlayerStore(queuePlaylistId);
  const isQueue = playingPlaylistId === playlistId;
  /* The list draws the shuffled queue's own order while this playlist is the
   * queue, which is also when the filter and the sort step aside. */
  const listShuffled = shuffled && isQueue;
  /*
   * The filter lasts for the visit only, and is not applied while the shuffled
   * queue is on screen; the choice survives until the shuffle is turned off.
   */
  const [trackState, setTrackState] = useState<TrackFilterState | null>(null);
  /* The exchange of the queue's order, which is held behind the skeleton. */
  const [rebuilding, setRebuilding] = useState(false);
  /*
   * The route reuses this component across ids, so the filter, the link notice
   * and its decision are cleared with the playlist.
   */
  useEffect(() => {
    setTrackState(null);
    setLinkNotice(null);
    inspectedLink.current = null;
    redirectingLink.current = null;
  }, [playlistId]);
  const activeState = listShuffled ? null : trackState;
  const tracks = usePlaylistTracks(playlistId, activeState ?? undefined);
  const queueRead = usePlaylistQueue(
    playlistId,
    isQueue || trackParam !== null
  );
  useQueueRefetch(playlist.data, queueRead.data?.items);
  /* The queue's own derivation, so a shuffled queue goes dead at its last entry
   * exactly as an unshuffled one does. */
  const canSkipNext = usePlayerStore(hasNext);

  const listRef = useRef<HTMLUListElement>(null);
  const scrollHandledFor = useRef<string | null>(null);
  /* A shuffle toggle earns the landing the open already took. */
  const landAfterToggle = useRef(false);
  /* A link that starts the queue earns the landing the open could not take. */
  const landAfterLink = useRef(false);
  const orderFrames = useRef<number[]>([]);
  const inspectedLink = useRef<string | null>(null);
  const redirectingLink = useRef<string | null>(null);

  const currentLoaded =
    currentId !== null &&
    tracks.tracks.some(association => association.track.id === currentId);

  /*
   * The list has no place to stand while the pages that hold the current row
   * arrive; the skeleton holds its geometry rather than a list about to jump.
   * The sort, the chips and Load more belong to that list, so they wait too.
   */
  const landing =
    isQueue &&
    currentId !== null &&
    activeState === null &&
    tracks.isSuccess &&
    !currentLoaded &&
    tracks.hasMore &&
    !tracks.moreFailed;

  /*
   * Opening the queue's playlist lands on its current row, not the top, and a
   * shuffle toggle lands again: the row it draws changed places with the order.
   * The jump waits one task because the router resets a cached navigation to the
   * top, and pages load until the row exists.
   */
  useLayoutEffect(() => {
    if (!isQueue || currentId === null) {
      scrollHandledFor.current = playlistId;
      return;
    }

    if (activeState !== null || !tracks.isSuccess || tracks.isPlaceholderData) {
      return;
    }

    const row = listRef.current?.querySelector<HTMLElement>('li[data-state]');

    /* A playhead that moved outside the loaded pages still needs them, even
     * after this visit has landed, or the skeleton would stand forever. */
    if (row === null || row === undefined) {
      if (tracks.hasMore && !tracks.loadingMore && !tracks.moreFailed) {
        tracks.loadMore();
      } else if (!tracks.hasMore) {
        scrollHandledFor.current = playlistId;
        landAfterToggle.current = false;
        landAfterLink.current = false;
      }

      return;
    }

    if (
      scrollHandledFor.current === playlistId &&
      !landAfterToggle.current &&
      !landAfterLink.current
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      row.scrollIntoView({ behavior: 'instant', block: 'center' });
      scrollHandledFor.current = playlistId;
      landAfterToggle.current = false;
      landAfterLink.current = false;
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    activeState,
    currentId,
    isQueue,
    listShuffled,
    playlistId,
    tracks.hasMore,
    tracks.isPlaceholderData,
    tracks.isSuccess,
    tracks.loadMore,
    tracks.loadingMore,
    tracks.moreFailed,
    tracks.tracks
  ]);

  /* Both frames are cancelled on the way out, so a route change mid-exchange
   * leaves the store alone. */
  useEffect(
    () => () => {
      for (const frame of orderFrames.current) {
        cancelAnimationFrame(frame);
      }
    },
    []
  );

  /* A press that never became a queue leaves no landing owed. */
  useEffect(() => {
    if (!transition.starting && !isQueue) {
      landAfterToggle.current = false;
      landAfterLink.current = false;
    }
  }, [transition.starting, isQueue]);

  const ownerName =
    playlist.data !== undefined && directory.data !== undefined
      ? ownerNameFrom(directory.data, playlist.data.ownerAccountId)
      : null;

  /* The transition's subject, held stable so a row's memo survives a render. No
   * control is drawn before the read answers, so the empty name is never
   * spoken. */
  const playlistView = useMemo(
    () => ({ id: playlistId, name: playlist.data?.name ?? '' }),
    [playlistId, playlist.data?.name]
  );

  /* The press this screen made, if any: a start on another playlist is not
   * this header's to claim. */
  const startingThisPlaylist = pressForPlaylist(
    transition.startingPress,
    playlistId
  );

  /* A row press moves the playhead inside the queue the listener sees. */
  const playTrack = useCallback(
    (trackId: string) => transition.playTrack(playlistView, trackId),
    [transition.playTrack, playlistView]
  );

  /* A 404 on an open playlist with a track param is the bare track, silently;
   * the open playlist without one keeps the not-found body. */
  useEffect(() => {
    if (
      trackParam === null ||
      !playlist.isError ||
      !(playlist.error instanceof ApiError) ||
      playlist.error.status !== 404
    ) {
      return;
    }

    void navigate({
      to: '/tracks/$trackId',
      params: { trackId: trackParam },
      replace: true
    });
  }, [navigate, playlist.error, playlist.isError, trackParam]);

  /* A link naming a track is resolved against the whole queue before anything
   * starts: absent hops to the bare track, unplayable explains itself here. */
  useEffect(() => {
    if (trackParam === null || playlist.data === undefined) {
      return;
    }

    if (queueRead.isError || queueRead.data === undefined) {
      return;
    }

    if (inspectedLink.current === trackParam) {
      return;
    }

    const association = queueRead.data.items.find(
      entry => entry.track.id === trackParam
    );

    inspectedLink.current = trackParam;

    if (association === undefined) {
      redirectingLink.current = trackParam;
      router.history.replace(`/tracks/${encodeURIComponent(trackParam)}`, {
        leftPlaylist: true
      });
      return;
    }

    if (!isPlayable(association.track)) {
      setLinkNotice(cannotPlayNotice(association.track, t));
      return;
    }

    const player = usePlayerStore.getState();

    if (
      queuePlaylistId(player) === playlistId &&
      player.currentId === trackParam
    ) {
      return;
    }

    landAfterLink.current = true;
    playTrack(trackParam);
  }, [
    navigate,
    playTrack,
    playlist.data,
    playlistId,
    queueRead.data,
    queueRead.isError,
    router,
    t,
    trackParam
  ]);

  /* While this playlist is the queue, the address bar names its current track;
   * another queue leaves no track on this page. The mirror never moves the
   * reader, and a link whose entry has not decided yet is not its to remove. */
  useEffect(() => {
    if (playlist.data === undefined) {
      return;
    }

    if (
      trackParam !== null &&
      (inspectedLink.current !== trackParam ||
        redirectingLink.current === trackParam)
    ) {
      return;
    }

    const player = usePlayerStore.getState();
    const target =
      queuePlaylistId(player) === playlistId && player.currentId !== null
        ? player.currentId
        : null;

    if (trackParam === target) {
      return;
    }

    void navigate({
      to: '/playlists/$playlistId',
      params: { playlistId },
      search: target === null ? {} : { track: target },
      replace: true,
      resetScroll: false
    });
  }, [
    currentId,
    navigate,
    playlist.data,
    playlistId,
    playingPlaylistId,
    queueRead.data,
    trackParam
  ]);

  /* The exchange freezes the frame it lands on, so the skeleton is painted first
   * and stands through it; the list stays mounted under it, keeping scroll and
   * height. */
  const toggleShuffle = useCallback(() => {
    landAfterToggle.current = true;

    const hold =
      isQueue && !rebuilding && tracks.tracks.length >= REORDER_HOLD_ROWS;

    if (!hold) {
      transition.shuffle(playlistView);
      return;
    }

    flushSync(() => setRebuilding(true));

    orderFrames.current = [
      requestAnimationFrame(() => {
        orderFrames.current.push(
          requestAnimationFrame(() => {
            transition.shuffle(playlistView);
            setRebuilding(false);
            orderFrames.current = [];
          })
        );
      })
    ];
  }, [
    isQueue,
    rebuilding,
    tracks.tracks.length,
    transition.shuffle,
    playlistView
  ]);

  /* The whole playlist's counts, read before the header so its play control
   * and the queue cannot disagree about whether anything is stored. */
  const counts = tracks.counts;
  const playable = counts === undefined || hasPlayableTrack({ counts });

  /* The link is absolute so it survives a paste into a chat; an insecure
   * origin has no clipboard, which reports the failure rather than silence. */
  const copyTrackLink = useCallback(
    (trackId: string): void => {
      const url = new URL(`/playlists/${playlistId}`, window.location.origin);
      url.searchParams.set('track', trackId);

      void (async () => {
        try {
          await navigator.clipboard.writeText(url.href);
          setCopyResult(CopyLinkResult.Copied);
        } catch {
          setCopyResult(CopyLinkResult.Failed);
        }
      })();
    },
    [playlistId]
  );

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
  const retryFailedTracks = useCallback(
    (): void => retryAllFailed.mutate(),
    [retryAllFailed.mutate]
  );
  const fetchWholeTrack = useCallback(
    (trackId: string): void => fetchWhole.mutate(trackId),
    [fetchWhole.mutate]
  );
  const cancelRunningSync = useCallback(
    (): void =>
      cancelSync.mutate(playlistId, {
        onError: error =>
          setCancelRefused({ detail: problemSentence(t, error) })
      }),
    [cancelSync.mutate, playlistId, t]
  );

  const neverSynced = playlist.data?.lastSyncedAt === null;
  const canWrite = canWritePlaylist(playlist.data);
  const runRunning = latestRun.data?.status === SyncRunStatus.Running;
  const syncInFlight =
    playlist.data?.syncStatus === PlaylistSyncStatus.Syncing ||
    actions.syncing(playlistId) ||
    runRunning;
  const cancelling =
    cancelSync.isPending && cancelSync.variables === playlistId;
  /* The one track whose row action is in flight, so its menu is not opened onto
   * a second press while the first is still running. */
  const busyTrackId = retry.isPending
    ? retry.variables
    : fetchWhole.isPending
      ? fetchWhole.variables
      : undefined;

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

  /* The link's refusal withdraws on the notice window. */
  useEffect(() => {
    if (linkNotice === null) {
      return;
    }

    const timer = setTimeout(() => setLinkNotice(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [linkNotice]);

  /* The copy result withdraws on the same window; the toast owns no timer. */
  useEffect(() => {
    if (copyResult === null) {
      return;
    }

    const timer = setTimeout(() => setCopyResult(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [copyResult]);

  /* The refusal withdraws on the window the shuffle notice uses. */
  useEffect(() => {
    if (settingRefused === null) {
      return;
    }

    const timer = setTimeout(() => setSettingRefused(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [settingRefused]);

  /* A failed cancel keeps the run syncing; its notice withdraws like the rest. */
  useEffect(() => {
    if (cancelRefused === null) {
      return;
    }

    const timer = setTimeout(() => setCancelRefused(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [cancelRefused]);
  const failed = playlist.data?.syncStatus === PlaylistSyncStatus.Error;
  /* The failed band owns the retry, so the header does not draw a second one. */
  const syncErrorShown = failed && latestRun.isSuccess;
  const playlistPending = deferred.windows.some(
    entry => entry.id === playlistId
  );
  const playingThis = isPlaying && isQueue;

  /*
   * The chips are the whole-playlist counts the read folds in, drawn only once
   * it has answered; the row survives an empty filter to keep "Show all".
   */
  const hasTracks = (playlist.data?.trackCount ?? 0) > 0;
  /* One control owns the start where the list is empty: the empty state's own
   * button, not a second one in the header. */
  const emptyStateSync = neverSynced && tracks.isSuccess && !hasTracks;
  /*
   * The empty state waits for the filter's own answer: `keepPreviousData` keeps
   * the previous total on hand while the next state loads.
   */
  const filterEmpty =
    activeState !== null && !tracks.isPlaceholderData && tracks.total === 0;
  const filterEmptyMessage =
    activeState === null
      ? null
      : activeState === REMOTE_REMOVED
        ? t('detail.filterEmpty.remoteRemoved', {
            provider: providerLabel(
              t,
              playlist.data?.provider ?? Provider.Youtube
            )
          })
        : t(`detail.filterEmpty.${activeState}`);

  /*
   * The whole playlist's downloading count, an aggregate the read folds in, so
   * it does not follow the filter.
   */
  const downloadingCount = counts?.[TrackFileStatus.Downloading] ?? 0;
  const failedCount = counts?.[TrackFileStatus.Failed] ?? 0;

  /*
   * A 404 on an open playlist is the not-found state, or a silent hop to the
   * bare track when the link named one. Any other failure is a read to retry.
   */
  if (playlist.isError) {
    if (
      trackParam !== null &&
      playlist.error instanceof ApiError &&
      playlist.error.status === 404
    ) {
      return null;
    }

    if (playlist.error instanceof ApiError && playlist.error.status === 404) {
      return (
        <main className={styles.playlistDetail}>
          <PlaylistNotFound />
        </main>
      );
    }

    return (
      <main className={styles.playlistDetail}>
        <ReadFailure
          message={t('detail.readFailed')}
          error={playlist.error}
          onRetry={() => void playlist.refetch()}
          retrying={playlist.isFetching}
        />
      </main>
    );
  }

  /*
   * Every prop here is honoured by both header arrangements, the card above
   * 768px and the row below it, so the set is named once.
   */
  const headerProps: Omit<PlaylistHeaderSeam, 'playlist'> = {
    ownerName,
    heading: true,
    ground: true,
    onPlay: () => transition.play(playlistView),
    playable,
    playing: playingThis,
    current: isQueue,
    pending: playlistPending,
    onSkipBack: skipPrevious,
    onSkipNext: skipNext,
    hasNext: canSkipNext,
    onShuffle: toggleShuffle,
    shuffled,
    menu: actions.menuFor(playlist.data),
    /* The window claim is made only while the list is the whole playlist: a
     * narrowed list owes a denominator the card does not carry. */
    displayedCount:
      activeState === null && tracks.isSuccess
        ? tracks.tracks.length
        : undefined,
    playbackFailed: transition.retryable,
    playbackStarting:
      startingThisPlaylist !== null &&
      startingThisPlaylist.startTrackId === null,
    playbackBusy: startingThisPlaylist !== null,
    startingControl:
      startingThisPlaylist?.intent === StartIntent.Shuffle ? 'shuffle' : 'play',
    onRetryPlayback: transition.retry
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
          {isMobile ? t('detail.backShort') : t('detail.back')}
        </Link>
        <div className={styles.playlistDetail__actions}>
          {me.data?.role === UserRole.Admin ? <EgressLink /> : null}
          <LanguageMenu />
          {canWrite && !emptyStateSync && !syncErrorShown ? (
            <SyncControl
              label={
                isMobile
                  ? t('detail.syncPlaylistShort')
                  : t('detail.syncPlaylist')
              }
              visibleLabel={
                isMobile ? t('detail.syncPlaylistShort') : undefined
              }
              workingLabel={t('detail.syncingPlaylist')}
              working={syncInFlight}
              disabled={playlistPending}
              onPress={() => actions.syncNow(playlistId)}
            />
          ) : null}
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
        </div>
      </nav>

      {trackParam !== null && queueRead.isError ? (
        <ReadFailure
          message={t('detail.readFailed')}
          error={queueRead.error}
          onRetry={() => void queueRead.refetch()}
          retrying={queueRead.isFetching}
        />
      ) : null}

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
            {transition.retryable ? (
              <p
                className={styles.playlistDetail__playbackFailed}
                role="status">
                {t('detail.playbackFailed')}
              </p>
            ) : null}
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

            {syncErrorShown ? (
              <div className={styles.playlistDetail__state}>
                <SyncError
                  storedCount={counts?.[TrackFileStatus.Stored] ?? null}
                  provider={playlist.data?.provider ?? Provider.Youtube}
                  rawError={latestRun.data?.error ?? null}
                  onRetry={
                    canWrite ? () => actions.syncNow(playlistId) : undefined
                  }
                  retrying={syncInFlight}
                />
              </div>
            ) : null}

            {!failed &&
            latestRun.data !== null &&
            latestRun.data !== undefined &&
            counts !== undefined ? (
              <div className={styles.playlistDetail__state}>
                <SyncSummary
                  run={latestRun.data}
                  now={new Date()}
                  playlistName={playlist.data?.name ?? ''}
                  failedCount={failedCount}
                  remoteRemoved={tracks.remoteRemoved ?? 0}
                  provider={playlist.data?.provider ?? Provider.Youtube}
                  downloadingCount={downloadingCount}
                  onRetryFailed={
                    canWrite && activeState !== TrackFileStatus.Failed
                      ? retryFailedTracks
                      : undefined
                  }
                  retryingFailed={retryAllFailed.isPending}
                  onCancel={
                    canWrite && runRunning ? cancelRunningSync : undefined
                  }
                  cancelling={cancelling}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.playlistDetail__tracks}>
          {tracks.isSuccess && counts !== undefined && hasTracks && !landing ? (
            <div className={styles.playlistDetail__controls}>
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
              <PlaylistFilterChips
                counts={counts}
                remoteRemoved={tracks.remoteRemoved ?? 0}
                provider={playlist.data?.provider ?? Provider.Youtube}
                active={activeState}
                disabled={listShuffled}
                onChange={setTrackState}
              />
            </div>
          ) : null}
          <div className={styles.playlistDetail__flow}>
            {rebuilding ? (
              <div className={styles.playlistDetail__rebuild}>
                <div className={styles.playlistDetail__rebuildPanel}>
                  <TrackListSkeleton />
                </div>
              </div>
            ) : null}
            {/* Inert while the order is exchanged, so the sheet is all that is offered. */}
            <div inert={rebuilding}>
              {!rebuilding && (tracks.isPending || landing) ? (
                <TrackListSkeleton />
              ) : null}
              {tracks.isError ? (
                <ReadFailure
                  message={t('detail.readFailed')}
                  error={tracks.error}
                  onRetry={tracks.retry}
                  retrying={tracks.retrying}
                />
              ) : null}
              {activeState === TrackFileStatus.Failed &&
              tracks.isSuccess &&
              canWrite &&
              failedCount > 0 ? (
                <div className={styles.playlistDetail__bulkRetry}>
                  <RetryFailedControl
                    count={failedCount}
                    retrying={retryAllFailed.isPending}
                    onRetry={retryFailedTracks}
                  />
                </div>
              ) : null}
              {emptyStateSync ? (
                <EmptyState
                  onSync={
                    canWrite ? () => actions.syncNow(playlistId) : undefined
                  }
                  syncing={syncInFlight}
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
                <div
                  className={styles.playlistDetail__filterEmpty}
                  role="status">
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
              {tracks.isSuccess && tracks.tracks.length > 0 && !landing ? (
                <ul className={styles.playlistDetail__list} ref={listRef}>
                  {(listShuffled
                    ? orderTracksByQueue(
                        tracks.tracks,
                        queue.map(track => track.id)
                      )
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
                          deferred.windows.some(
                            entry => entry.id === association.track.id
                          )
                        }
                        onPlay={playTrack}
                        onRetry={canWrite ? retryTrack : undefined}
                        onFetchWhole={canWrite ? fetchWholeTrack : undefined}
                        onRemove={canWrite ? removeTrackDeferred : undefined}
                        onCopyLink={copyTrackLink}
                        skipNonMusic={playlist.data?.skipNonMusic ?? false}
                        busy={busyTrackId === association.track.id}
                        starting={
                          startingThisPlaylist?.startTrackId ===
                          association.track.id
                        }
                      />
                    );
                  })}
                </ul>
              ) : null}
              {tracks.isSuccess && tracks.hasMore && !landing ? (
                <LoadMoreControl
                  loading={tracks.loadingMore}
                  failed={tracks.moreFailed}
                  onLoadMore={tracks.loadMore}
                />
              ) : null}
            </div>
          </div>
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

      {/* A failure with a retry control is not also announced as a dead end. */}
      {transition.refusal === null || transition.retryable ? null : (
        <NoticeToast
          {...refusalNotice(transition.refusal, t)}
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
      {linkNotice === null ? null : (
        <NoticeToast
          message={linkNotice.message}
          detail={linkNotice.detail}
          durationMs={NOTICE_WINDOW_MS}
        />
      )}
      {cancelRefused === null ? null : (
        <NoticeToast
          message={t('syncSummary.cancelFailed')}
          detail={cancelRefused.detail}
          durationMs={NOTICE_WINDOW_MS}
        />
      )}
      {copyResult === null ? null : (
        <ToastStack>
          {copyResult === CopyLinkResult.Copied ? (
            <SuccessToast
              message={t('trackRow.linkCopied')}
              durationMs={NOTICE_WINDOW_MS}
              onDismiss={() => setCopyResult(null)}
            />
          ) : (
            <ErrorToast
              message={t('trackRow.linkCopyFailed')}
              durationMs={NOTICE_WINDOW_MS}
              onDismiss={() => setCopyResult(null)}
            />
          )}
        </ToastStack>
      )}
    </main>
  );
}
