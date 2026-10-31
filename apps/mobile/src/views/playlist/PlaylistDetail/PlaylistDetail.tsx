import { useCallback, useEffect, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets
} from 'react-native-safe-area-context';

import type { PlaylistTrack } from '@playliberty/contracts';
import {
  AddTrackOutcome,
  PlaylistSort,
  PlaylistSyncStatus,
  SyncRunStatus,
  TrackFileStatus
} from '@playliberty/contracts';
import { problemDetail, useI18n } from '@playliberty/i18n';

import { copyText } from '../../../shared/clipboard/copyText';
import Notice from '../../../shared/components/Notice/Notice';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import Spinner from '../../../shared/components/Spinner/Spinner';
import UndoSnackbar from '../../../shared/components/UndoSnackbar/UndoSnackbar';
import { isPlayable } from '../../../shared/playable/playable';
import { canWritePlaylist } from '../../../shared/playlistAccess/canWritePlaylist';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../../shared/styles/tokens';
import { STATUS_CHIPS } from '../../../shared/trackState/statusChips';

import { ApiError } from '../../../api/apiClient/ApiClient';
import {
  ownerNameFrom,
  useAccountDirectory
} from '../../../api/useAccountDirectory';
import { useAddTrack } from '../../../api/useAddTrack';
import { useDeletePlaylist } from '../../../api/useDeletePlaylist';
import { useFetchTrackWhole } from '../../../api/useFetchTrackWhole';
import { useLatestSyncRun } from '../../../api/useLatestSyncRun';
import { usePlaylist } from '../../../api/usePlaylist';
import { usePlaylistQueue } from '../../../api/usePlaylistQueue';
import { usePlaylistTracks } from '../../../api/usePlaylistTracks/usePlaylistTracks';
import { usePlaylists } from '../../../api/usePlaylists/usePlaylists';
import { useRemoveTrack } from '../../../api/useRemoveTrack';
import { useRenamePlaylist } from '../../../api/useRenamePlaylist';
import { useRetryFailedTracks } from '../../../api/useRetryFailedTracks';
import { useRetryTrack } from '../../../api/useRetryTrack';
import { useSyncPlaylist } from '../../../api/useSyncPlaylist';
import { useUpdateSkipNonMusic } from '../../../api/useUpdateSkipNonMusic/useUpdateSkipNonMusic';
import { useUpdateSort } from '../../../api/useUpdateSort';
import type { ApiConfig } from '../../../auth/useApiConfig';
import { playerBarHeight } from '../../../player/playerBarSize/playerBarSize';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import { playerTracks } from '../../../player/playerTrack/playerTrack';
import { orderTracksByQueue } from '../../../player/queueOrder/queueOrder';
import CoverSheet from '../../library/CoverSheet/CoverSheet';
import GalleryAddAction, {
  galleryAddActionSize
} from '../../library/GalleryAddAction/GalleryAddAction';
import PlaylistActionsSheet from '../../library/PlaylistActionsSheet/PlaylistActionsSheet';
import RenameSheet from '../../library/RenameSheet/RenameSheet';
import ShareSheet from '../../library/ShareSheet/ShareSheet';
import {
  type PlaylistActionKey,
  UNDO_WINDOW_MS,
  playlistActionsFor
} from '../../library/playlistActions/playlistActions';
import AddTrackSheet from '../AddTrackSheet/AddTrackSheet';
import PlaylistControls from '../PlaylistControls/PlaylistControls';
import PlaylistEmpty from '../PlaylistEmpty/PlaylistEmpty';
import PlaylistIdentity from '../PlaylistIdentity/PlaylistIdentity';
import PlaylistNotFound from '../PlaylistNotFound/PlaylistNotFound';
import SkipSetting from '../SkipSetting/SkipSetting';
import SyncBand from '../SyncBand/SyncBand';
import TrackActionsSheet from '../TrackActionsSheet/TrackActionsSheet';
import {
  type TrackActionKey,
  trackActionsFor
} from '../TrackActionsSheet/trackActions/trackActions';
import TrackListSkeleton from '../TrackListSkeleton/TrackListSkeleton';
import TrackRow from '../TrackRow/TrackRow';

type PendingAction =
  | {
      readonly kind: 'remove';
      readonly trackId: string;
      readonly message: string;
      readonly detail: string;
    }
  | {
      readonly kind: 'delete';
      readonly message: string;
      readonly detail: string;
    };

const LOAD_MORE_DISTANCE = tokenLength('space-9') * 8;

export interface PlaylistDetailProps {
  readonly playlistId: string | null;
  readonly config: ApiConfig | null;
  readonly onBack: () => void;
  readonly now?: Date;
  /* The undo window; the app always uses the six-second default. */
  readonly undoWindowMs?: number;
}

/* The detail's read surface. The identity block and the rows are one scroll, so
 * the cover leaves the screen as the list is walked. Each read outcome owns one
 * body; a failed read is never an empty list. */
export default function PlaylistDetail({
  playlistId,
  config,
  onBack,
  now,
  undoWindowMs = UNDO_WINDOW_MS
}: PlaylistDetailProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const playlist = usePlaylist(playlistId);
  const playlists = usePlaylists();
  const [filter, setFilter] = useState<TrackFileStatus | null>(null);
  const currentId = usePlayerStore(state => state.currentId);
  const shuffled = usePlayerStore(state => state.shuffle);
  const playerPlaylistId = usePlayerStore(state => state.playlistId);
  const playlistData = playlist.data;
  const isQueue =
    playlistData !== undefined && playerPlaylistId === playlistData.id;
  const listShuffled = isQueue && shuffled;
  /* The filter is the visit's, and it steps aside while the queue's own order
   * is on screen; the chips are disabled there. */
  const activeFilter = listShuffled ? null : filter;
  const tracks = usePlaylistTracks(playlistId, activeFilter ?? undefined);
  const sort = useUpdateSort(playlistId ?? '');
  const skipSetting = useUpdateSkipNonMusic(playlistId ?? '');
  const queue = usePlaylistQueue(playlistId, playlist.isSuccess);
  const addTrack = useAddTrack();
  const latestRun = useLatestSyncRun(playlistId);
  const directory = useAccountDirectory();
  const sync = useSyncPlaylist();
  const retry = useRetryTrack(playlistId ?? '');
  const retryFailed = useRetryFailedTracks(playlistId ?? '');
  const fetchWhole = useFetchTrackWhole(playlistId ?? '');
  const removeTrack = useRemoveTrack(playlistId ?? '');
  const deletePlaylist = useDeletePlaylist();
  const rename = useRenamePlaylist();
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [hiddenTracks, setHiddenTracks] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [headerProblem, setHeaderProblem] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameProblem, setRenameProblem] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [starting, setStarting] = useState<'play' | 'shuffle' | null>(null);
  const [notice, setNotice] = useState<{
    readonly message: string;
    readonly detail: string;
  } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scroll = useRef<ScrollView>(null);
  const landingPlaylist = useRef<string | null>(null);
  const landingTarget = useRef<string | null>(null);
  const landed = useRef(false);
  const pendingDelete = pending?.kind === 'delete';
  const start = usePlayerStore(state => state.start);
  const applyRefetch = usePlayerStore(state => state.applyRefetch);
  const setShuffle = usePlayerStore(state => state.setShuffle);
  const playerQueue = usePlayerStore(state => state.queue);
  const drawnRows = tracks.isSuccess
    ? tracks.items.filter(entry => !hiddenTracks.has(entry.track.id))
    : [];
  const rows = listShuffled
    ? orderTracksByQueue(drawnRows, playerQueue)
    : drawnRows;
  /* Until the current row is loaded, the pages are a walk with no list to
   * read; drawing each page on the way would freeze the screen. */
  const landing =
    isQueue &&
    currentId !== null &&
    tracks.isSuccess &&
    !tracks.isPlaceholderData &&
    tracks.hasMore &&
    !tracks.isFetchNextPageError &&
    !rows.some(entry => entry.track.id === currentId);
  const filterEmpty =
    activeFilter !== null &&
    tracks.isSuccess &&
    !tracks.isPlaceholderData &&
    tracks.total === 0;

  useEffect(() => {
    setFilter(null);
  }, [playlistId]);

  /* The queue route is the whole playable playlist, so its every answer is
   * re-applied over a queue that already belongs to this playlist. */
  useEffect(() => {
    if (
      !queue.isSuccess ||
      queue.data === undefined ||
      playlistData === undefined
    ) {
      return;
    }

    const items = queue.data.items.filter(entry => isPlayable(entry.track));

    applyRefetch(playlistData.id, playerTracks(items));
  }, [applyRefetch, playlistData, queue.data, queue.isSuccess]);

  /* Opening the queue's playlist lands on its current row once; a later start
   * or skip does not move the list under the reader. */
  if (
    playlistData !== undefined &&
    landingPlaylist.current !== playlistData.id
  ) {
    landingPlaylist.current = playlistData.id;
    landingTarget.current = isQueue ? currentId : null;
    landed.current = false;
  }
  const busyTrackId = retry.isPending
    ? retry.variables
    : fetchWhole.isPending
      ? fetchWhole.variables
      : undefined;
  const playlistFailure =
    problemDetail(
      t,
      playlist.error instanceof ApiError ? playlist.error.problem : null
    ) ?? t('detail.readFailed');
  const tracksFailure =
    problemDetail(
      t,
      tracks.error instanceof ApiError ? tracks.error.problem : null
    ) ?? t('detail.readFailed');

  /* A press on a loaded row moves the playhead in the queue it is already in,
   * so a shuffled order survives; otherwise the whole playable playlist starts
   * at that row rather than a queue built from the loaded page. */
  const playTrack = useCallback(
    (trackId: string): void => {
      if (playlistId === null) {
        return;
      }

      const player = usePlayerStore.getState();

      if (player.playlistId === playlistId && player.queue.includes(trackId)) {
        player.play(trackId);
        return;
      }

      const items = (queue.data?.items ?? []).filter(entry =>
        isPlayable(entry.track)
      );

      if (!items.some(entry => entry.track.id === trackId)) {
        return;
      }

      start(
        playerTracks(items),
        playlistData === undefined
          ? null
          : {
              id: playlistData.id,
              name: playlistData.name,
              coverUpdatedAt: playlistData.coverUpdatedAt,
              coverTrackId: playlistData.coverTrackId
            },
        trackId
      );
    },
    [playlistData, playlistId, queue.data, start]
  );
  const openActions = useCallback((trackId: string): void => {
    setActionTargetId(trackId);
  }, []);

  /* The next page is the loaded count, and a page is asked for when the list
   * nears its bottom rather than from a control. */
  const loadMore = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (!tracks.hasMore || tracks.isFetchingNextPage) {
      return;
    }

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const nearBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - LOAD_MORE_DISTANCE;

    if (nearBottom) {
      tracks.fetchNextPage();
    }
  };

  const landOnRow = (trackId: string, y: number): void => {
    if (landed.current || landingTarget.current !== trackId) {
      return;
    }

    landed.current = true;
    scroll.current?.scrollTo({
      y: Math.max(0, y - tokenLength('space-4')),
      animated: false
    });
  };

  /* A current row beyond the loaded pages is awaited page by page; the row's
   * own layout does the scroll once it exists. */
  useEffect(() => {
    const target = landingTarget.current;

    if (target === null || landed.current || !tracks.isSuccess) {
      return;
    }

    if (rows.some(entry => entry.track.id === target)) {
      return;
    }

    if (
      tracks.hasMore &&
      !tracks.isFetchingNextPage &&
      !tracks.isFetchNextPageError
    ) {
      tracks.fetchNextPage();
    }
  }, [
    rows,
    tracks.fetchNextPage,
    tracks.hasMore,
    tracks.isFetchingNextPage,
    tracks.isFetchNextPageError,
    tracks.isSuccess
  ]);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  if (playlist.isPending) {
    return (
      <SafeAreaView
        testID="playlist-screen"
        style={styles.screen}
        edges={['top', 'left', 'right']}>
        <View style={styles.stateBody}>
          <TrackListSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (playlist.isError) {
    const notFound =
      playlist.error instanceof ApiError && playlist.error.status === 404;

    return (
      <SafeAreaView
        testID="playlist-screen"
        style={styles.screen}
        edges={['top', 'left', 'right']}>
        <View style={styles.stateBody}>
          {notFound ? (
            <PlaylistNotFound onBack={onBack} />
          ) : (
            <ReadFailure
              message={playlistFailure}
              retrying={playlist.isFetching}
              onRetry={() => {
                void playlist.refetch();
              }}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const data = playlist.data;
  const ownerName = ownerNameFrom(directory.data ?? [], data.ownerAccountId);
  const syncing =
    latestRun.data?.status === SyncRunStatus.Running &&
    (data.syncStatus === PlaylistSyncStatus.Idle ||
      data.syncStatus === PlaylistSyncStatus.Syncing);
  const syncInFlight =
    sync.isPending || syncing || data.syncStatus === PlaylistSyncStatus.Syncing;
  const actionTarget =
    actionTargetId === null
      ? null
      : (tracks.items.find(entry => entry.track.id === actionTargetId) ?? null);
  const actions =
    actionTarget === null
      ? []
      : trackActionsFor(
          actionTarget.track,
          canWritePlaylist(data),
          data.skipNonMusic,
          busyTrackId === actionTarget.track.id
        );

  const problemMessage = (error: Error, fallback: string): string =>
    problemDetail(t, error instanceof ApiError ? error.problem : null) ??
    fallback;

  const headerActions = playlistActionsFor(data, { includePin: false });

  const chooseSort = (value: PlaylistSort): void => {
    sort.mutate(value, {
      onError: error => {
        setNotice({
          message: t('detail.sortNotice'),
          detail: problemMessage(error, t('detail.sortFailed'))
        });
      }
    });
  };

  const chooseSkip = (value: boolean): void => {
    skipSetting.mutate(value, {
      onError: error => {
        setNotice({
          message: t('detail.settingNotice'),
          detail: problemMessage(error, t('detail.settingFailed'))
        });
      }
    });
  };

  /* The picker holds the gallery's first page, never a later one, so a long
   * library costs one read. The detail's own playlist may fall past that page;
   * the sheet still leads with it. */
  const writablePlaylists =
    playlists.data === undefined
      ? []
      : playlists.data.items
          .slice(0, playlists.data.limit)
          .filter(canWritePlaylist);
  const addTruncated =
    playlists.data !== undefined && playlists.data.total > playlists.data.limit;
  const addProblem = addTrack.isError
    ? problemMessage(addTrack.error, t('addTrackDialog.failed'))
    : null;
  const addResult = addTrack.data ?? null;
  /* The floating action owns the bottom-right corner, so a notice or snackbar
   * clears its height rather than sitting under it. The bar owns the bottom
   * first, so both clear it too. */
  const playerOffset = currentId === null ? 0 : playerBarHeight;
  const floatingOffset =
    (canWritePlaylist(data)
      ? galleryAddActionSize + tokenLength('space-3')
      : 0) + playerOffset;

  const openAdd = (): void => {
    addTrack.reset();
    setAddOpen(true);
  };

  const closeAdd = (): void => {
    setAddOpen(false);
    addTrack.reset();
  };

  const openHeaderActions = (): void => {
    setHeaderProblem(null);
    setHeaderOpen(true);
  };

  /* A batch with a refusal stays open to draw every outcome. A clean batch has
   * nothing to answer, so the sheet goes. */
  const submitAdd = (url: string, playlistIds: string[]): void => {
    /* A new batch must not draw the last batch's outcomes while it runs. */
    addTrack.reset();
    addTrack.mutate(
      { url, playlistIds },
      {
        onSuccess: result => {
          if (
            result.results.some(
              entry => entry.outcome === AddTrackOutcome.Refused
            )
          ) {
            return;
          }

          closeAdd();
        }
      }
    );
  };

  const showControls =
    tracks.isSuccess && data.trackCount > 0 && tracks.counts !== undefined;
  const emptyFilterChip =
    activeFilter === null
      ? undefined
      : STATUS_CHIPS.find(chip => chip.value === activeFilter);
  const bandRun = latestRun.data ?? null;
  const bandCounts = tracks.counts;
  const band =
    latestRun.isSuccess && bandRun !== null && bandCounts !== undefined ? (
      <SyncBand
        playlist={data}
        run={bandRun}
        counts={bandCounts}
        now={now}
        canWrite={canWritePlaylist(data)}
        syncing={syncInFlight}
        onSync={() => {
          sync.mutate(data.id);
        }}
        retryingFailed={retryFailed.isPending}
        onRetryFailed={() => {
          retryFailed.mutate();
        }}
        showRunningStamp={!syncInFlight}
      />
    ) : null;

  const playableQueue = (queue.data?.items ?? []).filter(entry =>
    isPlayable(entry.track)
  );
  const queueEmpty = queue.isSuccess && playableQueue.length === 0;

  /* The queue route is the whole playable playlist, so a start never inherits
   * the loaded page. A read that has not landed is awaited, and a failure is
   * the start's own notice. */
  const readPlayableQueue = async (): Promise<readonly PlaylistTrack[]> => {
    const result = queue.isSuccess
      ? { data: queue.data, error: null }
      : await queue.refetch();

    if (result.error !== null) {
      throw result.error;
    }

    return (result.data?.items ?? []).filter(entry => isPlayable(entry.track));
  };

  const startPlaylist = async (intent: 'play' | 'shuffle'): Promise<void> => {
    setStarting(intent);

    try {
      const items = await readPlayableQueue();

      if (items.length === 0) {
        setNotice({
          message: t('start.empty', { name: data.name }),
          detail: t('start.emptyDetail')
        });
        return;
      }

      const index =
        intent === 'shuffle' ? Math.floor(Math.random() * items.length) : 0;
      const leader = items[index];

      if (leader === undefined) {
        return;
      }

      start(
        playerTracks(items),
        {
          id: data.id,
          name: data.name,
          coverUpdatedAt: data.coverUpdatedAt,
          coverTrackId: data.coverTrackId
        },
        leader.track.id,
        intent === 'shuffle'
      );
    } catch (error) {
      setNotice({
        message: t('start.unreachable', { name: data.name }),
        detail:
          problemDetail(t, error instanceof ApiError ? error.problem : null) ??
          t('start.unreachableDetail')
      });
    } finally {
      setStarting(null);
    }
  };

  const hideTrack = (trackId: string): void => {
    setHiddenTracks(previous => new Set(previous).add(trackId));
  };

  const unhideTrack = (trackId: string): void => {
    setHiddenTracks(previous => {
      const next = new Set(previous);
      next.delete(trackId);
      return next;
    });
  };

  const commitPending = (action: PendingAction): void => {
    if (action.kind === 'remove') {
      removeTrack.mutate(action.trackId, {
        onError: error => {
          unhideTrack(action.trackId);
          setNotice({
            message: problemMessage(error, t('detail.removeFailed')),
            detail: action.detail
          });
        }
      });
      return;
    }

    deletePlaylist.mutate(data.id, {
      onSuccess: onBack,
      onError: error => {
        setNotice({
          message: problemMessage(error, t('detail.deleteFailed')),
          detail: action.detail
        });
      }
    });
  };

  /* One window at a time: a second action sends the first now rather than
   * losing its request, then opens its own countdown. */
  const startPending = (next: PendingAction): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    if (pending !== null) {
      commitPending(pending);
    }

    if (next.kind === 'remove') {
      hideTrack(next.trackId);
    }

    setPending(next);
    timer.current = setTimeout(() => {
      commitPending(next);
      setPending(null);
      timer.current = null;
    }, undoWindowMs);
  };

  const undoPending = (): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    if (pending?.kind === 'remove') {
      unhideTrack(pending.trackId);
    }

    setPending(null);
  };

  const startRemove = (target: PlaylistTrack): void => {
    startPending({
      kind: 'remove',
      trackId: target.track.id,
      message: t('detail.removeDeferred'),
      detail: target.track.title
    });
  };

  const startDelete = (): void => {
    startPending({
      kind: 'delete',
      message: t('detail.deleteDeferred'),
      detail: data.name
    });
  };

  const chooseHeaderAction = (key: PlaylistActionKey): void => {
    if (key === 'delete') {
      setHeaderOpen(false);
      setHeaderProblem(null);
      startDelete();
      return;
    }

    if (key === 'sync') {
      sync.mutate(data.id, {
        onSuccess: () => {
          setHeaderOpen(false);
          setHeaderProblem(null);
        },
        onError: error => {
          setHeaderProblem(problemMessage(error, t('library.syncFailed')));
        }
      });
      return;
    }

    if (key === 'rename') {
      setHeaderOpen(false);
      setHeaderProblem(null);
      setRenameProblem(null);
      rename.reset();
      setRenameOpen(true);
      return;
    }

    if (key === 'share') {
      setHeaderOpen(false);
      setHeaderProblem(null);
      setShareOpen(true);
      return;
    }

    setHeaderOpen(false);
    setHeaderProblem(null);

    if (key === 'cover') {
      setCoverOpen(true);
    }
  };

  const copyTrackLink = (target: PlaylistTrack): void => {
    if (config === null) {
      setNotice({
        message: t('trackRow.linkCopyFailed'),
        detail: target.track.title
      });
      return;
    }

    const origin = config.baseUrl.replace(/\/+$/, '');
    const url = `${origin}/playlists/${encodeURIComponent(
      data.id
    )}?track=${encodeURIComponent(target.track.id)}`;

    void copyText(url)
      .then(copied => {
        setNotice({
          message: copied
            ? t('trackRow.linkCopied')
            : t('trackRow.linkCopyFailed'),
          detail: target.track.title
        });
      })
      .catch(() => {
        setNotice({
          message: t('trackRow.linkCopyFailed'),
          detail: target.track.title
        });
      });
  };

  const chooseTrackAction = (key: TrackActionKey): void => {
    const target = actionTarget;
    setActionTargetId(null);

    if (target === null) {
      return;
    }

    if (key === 'copy') {
      copyTrackLink(target);
      return;
    }

    if (key === 'remove') {
      startRemove(target);
      return;
    }

    if (key === 'retry') {
      retry.mutate(target.track.id, {
        onError: error => {
          setNotice({
            message: problemMessage(error, t('trackRow.failure.unknown')),
            detail: target.track.title
          });
        }
      });
      return;
    }

    fetchWhole.mutate(target.track.id, {
      onError: error => {
        setNotice({
          message: problemMessage(error, t('trackRow.failure.unknown')),
          detail: target.track.title
        });
      }
    });
  };

  return (
    <SafeAreaView
      testID="playlist-screen"
      style={styles.screen}
      edges={['top', 'left', 'right']}>
      <ScrollView
        ref={scroll}
        testID="playlist-scroll"
        showsVerticalScrollIndicator={false}
        pointerEvents={pendingDelete ? 'none' : 'auto'}
        style={pendingDelete ? styles.pending : undefined}
        onScroll={loadMore}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom +
              tokenLength('space-4') +
              galleryAddActionSize +
              tokenLength('space-3') +
              playerOffset
          }
        ]}>
        <PlaylistIdentity
          playlist={data}
          ownerName={ownerName}
          config={config}
          syncing={syncing}
          now={now}
          starting={starting}
          shuffled={listShuffled}
          onPlay={
            queueEmpty
              ? undefined
              : () => {
                  void startPlaylist('play');
                }
          }
          onShuffle={
            queueEmpty
              ? undefined
              : () => {
                  if (listShuffled) {
                    setShuffle(false);
                    return;
                  }

                  void startPlaylist('shuffle');
                }
          }
          onOpenActions={
            headerActions.length > 0 ? openHeaderActions : undefined
          }>
          <SkipSetting
            skipNonMusic={data.skipNonMusic}
            canEdit={canWritePlaylist(data)}
            saving={skipSetting.isPending}
            onChange={chooseSkip}
          />
        </PlaylistIdentity>
        {band}
        {showControls ? (
          <PlaylistControls
            sort={data.sort}
            canEdit={canWritePlaylist(data)}
            shuffled={listShuffled}
            saving={sort.isPending}
            counts={tracks.counts}
            active={activeFilter}
            onSortChange={chooseSort}
            onFilterChange={setFilter}
          />
        ) : null}
        {tracks.isPending || landing ? <TrackListSkeleton /> : null}
        {tracks.isError ? (
          <View style={styles.tracksState}>
            <ReadFailure
              message={tracksFailure}
              retrying={tracks.isFetching}
              onRetry={tracks.refetch}
            />
          </View>
        ) : null}
        {tracks.isSuccess && data.trackCount === 0 ? (
          data.lastSyncedAt === null ? (
            <PlaylistEmpty
              onSync={
                canWritePlaylist(data)
                  ? () => {
                      sync.mutate(data.id);
                    }
                  : undefined
              }
              syncing={syncInFlight}
            />
          ) : (
            <Text testID="playlist-no-tracks" style={styles.note}>
              {t('detail.noTracks')}
            </Text>
          )
        ) : null}
        {filterEmpty && emptyFilterChip !== undefined ? (
          <View testID="filter-empty" style={styles.filterEmpty}>
            <Text style={styles.filterEmptyText}>
              {t(emptyFilterChip.empty)}
            </Text>
            <Pressable
              testID="filter-show-all"
              accessibilityRole="button"
              accessibilityLabel={t('detail.filterShowAll')}
              style={styles.filterShowAll}
              onPress={() => setFilter(null)}>
              <Text style={styles.filterShowAllLabel}>
                {t('detail.filterShowAll')}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {tracks.isSuccess && !landing && !filterEmpty && data.trackCount > 0
          ? rows.map(entry => (
              <View
                key={entry.track.id}
                testID={`track-slot-${entry.track.id}`}
                onLayout={event =>
                  landOnRow(entry.track.id, event.nativeEvent.layout.y)
                }>
                <TrackRow
                  association={entry}
                  config={config}
                  current={currentId === entry.track.id}
                  onOpenActions={openActions}
                  onPlay={playTrack}
                />
              </View>
            ))
          : null}
        {!landing && tracks.isFetchingNextPage ? (
          <View testID="tracks-append" style={styles.append}>
            <Spinner color={tokenColor('muted')} />
            <Text style={styles.appendLabel}>
              {t('detail.loadMoreLoading')}
            </Text>
          </View>
        ) : null}
        {tracks.isFetchNextPageError ? (
          <Pressable
            testID="tracks-append-retry"
            accessibilityRole="button"
            accessibilityLabel={t('detail.loadMoreRetry')}
            style={styles.appendRetry}
            onPress={tracks.fetchNextPage}>
            <Text style={styles.appendRetryLabel}>
              {t('detail.loadMoreRetry')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
      {canWritePlaylist(data) ? (
        <GalleryAddAction
          testID="detail-add-track"
          label={t('detail.addTrack')}
          horizontalInset={tokenLength('space-4')}
          bottomOffset={playerOffset}
          onPress={openAdd}
        />
      ) : null}
      <AddTrackSheet
        visible={addOpen}
        currentPlaylist={data}
        playlists={writablePlaylists}
        firstPageLimit={playlists.data?.limit ?? null}
        truncated={addTruncated}
        busy={addTrack.isPending}
        problem={addProblem}
        result={addResult}
        onSubmit={submitAdd}
        onClose={closeAdd}
      />
      <TrackActionsSheet
        trackTitle={actionTarget?.track.title ?? null}
        actions={actions}
        onSelect={chooseTrackAction}
        onClose={() => setActionTargetId(null)}
      />
      <PlaylistActionsSheet
        playlistName={headerOpen ? data.name : null}
        actions={headerActions}
        problem={headerProblem}
        onSelect={chooseHeaderAction}
        onClose={() => {
          setHeaderOpen(false);
          setHeaderProblem(null);
        }}
      />
      <CoverSheet
        playlist={coverOpen ? data : null}
        config={config}
        onClose={() => setCoverOpen(false)}
      />
      <RenameSheet
        visible={renameOpen}
        currentName={data.name}
        busy={rename.isPending}
        problem={renameProblem}
        onSubmit={name => {
          rename.mutate(
            { playlistId: data.id, name },
            {
              onSuccess: () => {
                setRenameOpen(false);
                setRenameProblem(null);
              },
              onError: error => {
                setRenameProblem(
                  problemMessage(error, t('renameDialog.failed'))
                );
              }
            }
          );
        }}
        onClose={() => {
          setRenameOpen(false);
          setRenameProblem(null);
          rename.reset();
        }}
      />
      <ShareSheet
        visible={shareOpen}
        playlistId={data.id}
        onClose={() => setShareOpen(false)}
      />
      {pending === null ? null : (
        <UndoSnackbar
          key={pending.kind === 'remove' ? pending.trackId : 'delete'}
          message={pending.message}
          detail={pending.detail}
          durationMs={undoWindowMs}
          bottomOffset={floatingOffset}
          horizontalInset={tokenLength('space-4')}
          onUndo={undoPending}
        />
      )}
      {notice === null ? null : (
        <Notice
          message={notice.message}
          detail={notice.detail}
          onDismiss={() => setNotice(null)}
          bottomOffset={
            floatingOffset +
            (pending === null
              ? 0
              : tokenLength('space-9') + tokenLength('space-4'))
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokenColor('bg')
  },
  content: {
    paddingHorizontal: tokenLength('space-4'),
    paddingTop: tokenLength('space-4'),
    gap: tokenLength('space-3')
  },
  append: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokenLength('space-2'),
    paddingVertical: tokenLength('space-3')
  },
  appendLabel: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  appendRetry: {
    alignSelf: 'center',
    paddingHorizontal: tokenLength('space-4'),
    paddingVertical: tokenLength('space-2'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control')
  },
  appendRetryLabel: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  filterEmpty: {
    alignItems: 'center',
    gap: tokenLength('space-3'),
    paddingVertical: tokenLength('space-5')
  },
  filterEmptyText: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  filterShowAll: {
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-4'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control')
  },
  filterShowAllLabel: {
    color: tokenColor('accent'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '600'
  },
  stateBody: {
    flex: 1,
    padding: tokenLength('space-4')
  },
  pending: {
    opacity: tokenNumber('opacity-disabled')
  },
  tracksState: {
    minHeight: tokenLength('space-9') * 4,
    paddingVertical: tokenLength('space-4')
  },
  note: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-md')
  }
});
