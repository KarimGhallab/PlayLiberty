import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ViewToken
} from 'react-native';
import {
  Animated,
  BackHandler,
  Easing,
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets
} from 'react-native-safe-area-context';

import {
  ApiError,
  ownerNameFrom,
  useAccountDirectory,
  useAddTrack,
  useCancelSyncPlaylist,
  useDeletePlaylist,
  useFetchTrackWhole,
  useLatestSyncRun,
  usePlaylist,
  usePlaylistQueue,
  usePlaylistTracks,
  usePlaylists,
  useRemoveTrack,
  useRenamePlaylist,
  useRetryFailedTracks,
  useRetryTrack,
  useSyncPlaylist,
  useUpdateSkipNonMusic,
  useUpdateSort
} from '@playliberty/api-client';
import type { PlaylistTrack, TrackFilterState } from '@playliberty/contracts';
import {
  AddTrackOutcome,
  PlaylistSort,
  PlaylistSyncStatus,
  SyncRunStatus
} from '@playliberty/contracts';
import {
  cannotPlayNotice,
  problemDetail,
  providerLabel,
  useI18n
} from '@playliberty/i18n';
import {
  type PendingAction,
  type PlaylistActionKey,
  type TrackActionKey,
  UNDO_WINDOW_MS,
  canWritePlaylist,
  playlistActionsFor,
  trackActionsFor
} from '@playliberty/library';
import { orderTracksByQueue } from '@playliberty/player';
import { STATUS_CHIPS, standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../../shared/a11y/useReduceMotion/useReduceMotion';
import ActionDial, {
  actionDialSize
} from '../../../shared/components/ActionDial/ActionDial';
import Checkbox from '../../../shared/components/Checkbox/Checkbox';
import Notice from '../../../shared/components/Notice/Notice';
import ReadFailure from '../../../shared/components/ReadFailure';
import Spinner from '../../../shared/components/Spinner';
import UndoSnackbar from '../../../shared/components/UndoSnackbar/UndoSnackbar';
import { verticalListChrome } from '../../../shared/components/listChrome';
import { copyText } from '../../../shared/copyText';
import { MAX_CONTENT_WIDTH } from '../../../shared/styles/contentColumn';
import {
  fontFamily,
  tokenColor,
  tokenDuration,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../../shared/styles/tokens/tokens';
import { useDeferredAction } from '../../../shared/useDeferredAction';

import type { ApiConfig } from '../../../auth/useApiConfig/useApiConfig';
import { usePlayerBarHeight } from '../../../player/playerBarSize/PlayerBarSizeContext';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import {
  type StartIntent,
  applyPlaylistRefetch,
  playableTracks,
  startAtPlaylist,
  startAtTrack
} from '../../../player/startPlayback/startPlayback';
import CoverSheet from '../../library/CoverSheet/CoverSheet';
import PlaylistActionsSheet from '../../library/PlaylistActionsSheet';
import RenameSheet from '../../library/RenameSheet/RenameSheet';
import ShareSheet from '../../library/ShareSheet/ShareSheet';
import { holdLeftPlaylistNotice } from '../../track/leftPlaylistNotice';
import AddTrackSheet from '../AddTrackSheet/AddTrackSheet';
import PlaylistControls, {
  PlaylistControlsSkeleton
} from '../PlaylistControls/PlaylistControls';
import PlaylistEmpty from '../PlaylistEmpty';
import PlaylistIdentity, {
  HEADER_HEIGHT,
  type PlaylistIdentityProps,
  PlaylistIdentitySkeleton,
  useNarrowHeaderHeight
} from '../PlaylistIdentity/PlaylistIdentity';
import PlaylistNotFound from '../PlaylistNotFound';
import SyncBand from '../SyncBand/SyncBand';
import TrackActionsSheet from '../TrackActionsSheet/TrackActionsSheet';
import TrackListSkeleton from '../TrackListSkeleton';
import TrackRow from '../TrackRow/TrackRow';
import { claimsPull, commitsPull } from './pullDismiss/pullDismiss';

const LOAD_MORE_DISTANCE = tokenLength('space-9') * 8;
const COLLAPSE_DISTANCE = tokenLength('space-9') * 2;
/* The request waits one beat after the window so a gesture already queued when
 * the timer fired can still be read; only the clock decides the undo. */
const COMMIT_GRACE_MS = 150;
/* The add floats clear of the row's lane: the lane owns the trailing 48dp and
 * the trigger keeps a gap to its left. */
const DIAL_RIGHT =
  tokenLength('space-4') + touchTarget + tokenLength('space-2');

export interface PlaylistDetailProps {
  readonly playlistId: string | null;
  readonly config: ApiConfig | null;
  readonly onBack: () => void;
  /* The track a shared link names; absent for an ordinary visit. */
  readonly trackId?: string | null;
  /* The detail reports the track its address should name, or null. */
  readonly onAddressChange?: (trackId: string | null) => void;
  /* A link that cannot open this playlist leaves for the bare track. */
  readonly onBareTrackRedirect?: (trackId: string) => void;
  readonly now?: Date;
  /* The undo window; the app always uses the six-second default. */
  readonly undoWindowMs?: number;
}

/* The identity block and the rows are one scroll. Each read outcome owns one
 * body; a failed read is never an empty list. */
export default function PlaylistDetail({
  playlistId,
  config,
  onBack,
  trackId = null,
  onAddressChange,
  onBareTrackRedirect,
  now,
  undoWindowMs = UNDO_WINDOW_MS
}: PlaylistDetailProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const narrowHeader = useNarrowHeaderHeight();
  const window = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const barHeight = usePlayerBarHeight();
  /* The sheet's offset, moved by the drag and the pull's own completion; the
   * route owns the entry. */
  const sheetY = useRef(new Animated.Value(0)).current;
  const exiting = useRef(false);
  const exitMotion = useRef<Animated.CompositeAnimation | null>(null);
  const pullOffset = useRef(0);
  const headerEdge = useRef(0);
  const playlist = usePlaylist(playlistId);
  const playlists = usePlaylists();
  const [filter, setFilter] = useState<TrackFilterState | null>(null);
  const currentId = usePlayerStore(state => state.currentId);
  const isPlaying = usePlayerStore(state => state.isPlaying);
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
  const cancelSync = useCancelSyncPlaylist();
  const latestRun = useLatestSyncRun(playlistId);
  const directory = useAccountDirectory();
  const sync = useSyncPlaylist();
  const retry = useRetryTrack(playlistId ?? '');
  const retryFailed = useRetryFailedTracks(playlistId ?? '');
  const fetchWhole = useFetchTrackWhole(playlistId ?? '');
  const removeTrack = useRemoveTrack(playlistId ?? '');
  const deletePlaylist = useDeletePlaylist();
  const rename = useRenamePlaylist();
  const deferred = useDeferredAction(undoWindowMs);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
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
    readonly detail: string | null;
  } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  /* The header's lower edge follows its own state, so a pull that starts on it
   * is told apart from one on the list under it. */
  useEffect(() => {
    headerEdge.current =
      insets.top + (collapsed ? narrowHeader : HEADER_HEIGHT.wide);
  }, [collapsed, insets.top, narrowHeader]);
  const collapsedRef = useRef(false);
  const headerProgress = useRef(new Animated.Value(0)).current;
  const headerTarget = useRef(0);
  const headerShown = useRef(0);
  const headerFrame = useRef<number | null>(null);
  const scroll = useRef<FlatList<PlaylistTrack>>(null);
  const landingPlaylist = useRef<string | null>(null);
  const landingTarget = useRef<string | null>(null);
  const landed = useRef(false);
  const [viewable, setViewable] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [viewabilityReady, setViewabilityReady] = useState(false);
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { readonly viewableItems: readonly ViewToken[] }) => {
      setViewable(
        new Set(
          viewableItems.flatMap(item => (item.key === null ? [] : [item.key]))
        )
      );
      setViewabilityReady(true);
    }
  ).current;
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 100
  }).current;
  const detailWindows = deferred.windows.filter(window =>
    window.kind?.startsWith('detail-')
  );
  const pendingDelete = detailWindows.some(
    window => window.kind === 'detail-playlist'
  );
  const undoWindow = detailWindows.find(window => window.started) ?? null;
  /* A removal keeps its row hidden until the request settles, whether the
   * window is still open or the commit is in flight. */
  const removingTrackId =
    removeTrack.isPending && removeTrack.variables !== undefined
      ? removeTrack.variables
      : null;
  const hiddenTrackIds = new Set(
    detailWindows
      .filter(window => window.kind === 'detail-track')
      .map(window => window.id)
  );

  if (removingTrackId !== null) {
    hiddenTrackIds.add(removingTrackId);
  }
  const client = useQueryClient();
  const setShuffle = usePlayerStore(state => state.setShuffle);
  const setPlaying = usePlayerStore(state => state.setPlaying);
  const playerQueue = usePlayerStore(state => state.queue);
  /* A link's target is read once per mount: the address mirrors the current
   * track after entry, so a later prop is not a second link. */
  const linkTarget = useRef<string | null>(trackId).current;
  const enteredLink = useRef(false);
  const redirectingLink = useRef(false);
  const [linkSettled, setLinkSettled] = useState(linkTarget === null);
  const mirroredAddress = useRef<string | null | undefined>(undefined);
  const drawnRows = tracks.isSuccess
    ? tracks.items.filter(entry => !hiddenTrackIds.has(entry.track.id))
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

    applyPlaylistRefetch(playlistData.id, queue.data.items);
  }, [playlistData, queue.data, queue.isSuccess]);

  /* A 404 on a track link goes silently to the bare track: the access model
   * never confirms the playlist exists. Other failures keep the read failure. */
  useEffect(() => {
    if (
      linkTarget === null ||
      redirectingLink.current ||
      !playlist.isError ||
      !(playlist.error instanceof ApiError) ||
      playlist.error.status !== 404
    ) {
      return;
    }

    redirectingLink.current = true;
    onBareTrackRedirect?.(linkTarget);
  }, [linkTarget, onBareTrackRedirect, playlist.error, playlist.isError]);

  /* A link enters once reads land: a foreign queue starts at the track, this
   * queue jumps; a departed one leaves with its notice, an unplayable stays. */
  useEffect(() => {
    if (enteredLink.current || linkTarget === null) {
      return;
    }

    if (playlistData === undefined || !queue.isSuccess) {
      return;
    }

    enteredLink.current = true;
    setLinkSettled(true);

    void startAtTrack(client, playlistData, linkTarget, {
      resumeCurrent: false
    }).then(refusal => {
      if (refusal === null) {
        return;
      }

      if (refusal.kind === 'missing') {
        redirectingLink.current = true;
        holdLeftPlaylistNotice();
        onBareTrackRedirect?.(linkTarget);
        return;
      }

      if (refusal.kind === 'unplayable') {
        setNotice(cannotPlayNotice(refusal.track, t));
      }
    });
  }, [
    client,
    linkTarget,
    onBareTrackRedirect,
    playlistData,
    queue.isSuccess,
    t
  ]);

  /* The address names the playing track while this detail is the queue, and none
   * otherwise. A link's target holds its place until entry settles. */
  useEffect(() => {
    if (onAddressChange === undefined) {
      return;
    }

    const next =
      isQueue && currentId !== null
        ? currentId
        : linkSettled
          ? null
          : linkTarget;

    if (mirroredAddress.current === next) {
      return;
    }

    mirroredAddress.current = next;
    onAddressChange(next);
  }, [currentId, isQueue, linkSettled, linkTarget, onAddressChange]);

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
   * so a shuffled order survives; otherwise the whole playlist starts there. */
  const playTrack = useCallback(
    (trackId: string): void => {
      if (playlistData === undefined) {
        return;
      }

      void startAtTrack(client, playlistData, trackId);
    },
    [client, playlistData]
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

  /* The header chases the offset on its own frames: events set the target, the
   * loop keeps motion when they thin. Reduced motion tracks the event instead. */
  const followHeader = (): void => {
    if (reduceMotion) {
      headerShown.current = headerTarget.current;
      headerProgress.setValue(headerShown.current);
      return;
    }

    if (headerFrame.current !== null) {
      return;
    }

    const step = (): void => {
      const target = headerTarget.current;
      const next = headerShown.current + (target - headerShown.current) * 0.4;
      const settled = Math.abs(target - next) < 0.002;
      headerShown.current = settled ? target : next;
      headerProgress.setValue(headerShown.current);

      if (settled) {
        headerFrame.current = null;
        return;
      }

      headerFrame.current = requestAnimationFrame(step);
    };

    headerFrame.current = requestAnimationFrame(step);
  };

  const readScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const offset = event.nativeEvent.contentOffset.y;
    pullOffset.current = offset;
    headerTarget.current = Math.min(1, Math.max(0, offset / COLLAPSE_DISTANCE));
    followHeader();
    const next = offset > COLLAPSE_DISTANCE / 2;

    if (next !== collapsedRef.current) {
      collapsedRef.current = next;
      setCollapsed(next);
    }

    loadMore(event);
  };

  useEffect(
    () => () => {
      if (headerFrame.current !== null) {
        cancelAnimationFrame(headerFrame.current);
      }
    },
    []
  );

  /* A new playlist starts the viewability pass over, so the old list's visible
   * keys cannot land the new one. */
  useEffect(() => {
    setViewable(new Set());
    setViewabilityReady(false);
  }, [playlistId]);

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

  /* The list owns the scroll: once the target is loaded and the first
   * viewability pass says it is not on screen, the list jumps to its index. */
  useEffect(() => {
    const target = landingTarget.current;

    if (target === null || landed.current || !tracks.isSuccess || landing) {
      return;
    }

    const index = rows.findIndex(entry => entry.track.id === target);

    if (index < 0 || !viewabilityReady) {
      return;
    }

    landed.current = true;

    if (viewable.has(target)) {
      return;
    }

    scroll.current?.scrollToIndex({
      index,
      animated: false,
      viewOffset: tokenLength('space-4')
    });
  }, [landing, rows, tracks.isSuccess, viewabilityReady, viewable]);

  const settleSheet = useCallback((): void => {
    if (reduceMotion) {
      sheetY.setValue(0);
      return;
    }

    Animated.timing(sheetY, {
      toValue: 0,
      duration: tokenDuration('motion-base'),
      easing: Easing.bezier(...standardEasingBezier),
      useNativeDriver: true
    }).start();
  }, [reduceMotion, sheetY]);

  const leaveDetail = useCallback((): void => {
    onBack();
  }, [onBack]);

  /* The pull completes on its own tween: the native dismissal would restart
   * from rest, freezing the sheet and carrying the scrim down with it. */
  const dismissSheet = useCallback((): void => {
    if (reduceMotion) {
      leaveDetail();
      return;
    }

    exiting.current = true;
    exitMotion.current = Animated.timing(sheetY, {
      toValue: window.height,
      duration: tokenDuration('motion-slow'),
      easing: Easing.bezier(...standardEasingBezier),
      useNativeDriver: true
    });
    exitMotion.current.start(({ finished }) => {
      if (finished) {
        leaveDetail();
      }
    });
  }, [leaveDetail, reduceMotion, sheetY, window.height]);

  useEffect(() => () => exitMotion.current?.stop(), []);

  /* A delete's undo window owns the screen, so back waits for it. Otherwise the
   * system owns the gesture and the stack's pop animation. */
  useEffect(() => {
    if (!pendingDelete) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true
    );

    return () => subscription.remove();
  }, [pendingDelete]);

  /* The header is a handle at any scroll position; the list is one only at its
   * top. A downward pull past the threshold leaves; anything less returns. */
  const pull = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (event, gesture) =>
          !exiting.current &&
          claimsPull({
            dx: gesture.dx,
            dy: gesture.dy,
            offset: pullOffset.current,
            /* The grant fills y0, so the first move reads its own start. */
            startY: event.nativeEvent.pageY - gesture.dy,
            headerBottom: headerEdge.current
          }),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_event, gesture) => {
          if (reduceMotion || exiting.current) {
            return;
          }

          sheetY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_event, gesture) => {
          if (exiting.current) {
            return;
          }

          if (commitsPull(gesture.dy, gesture.vy)) {
            dismissSheet();
            return;
          }

          settleSheet();
        },
        onPanResponderTerminate: () => {
          if (!exiting.current) {
            settleSheet();
          }
        }
      }),
    [dismissSheet, reduceMotion, settleSheet, sheetY]
  );

  const sheetScrim = sheetY.interpolate({
    inputRange: [0, window.height],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  const sheet = (body: ReactNode) => (
    <View style={styles.sheetHost}>
      <Animated.View
        testID="playlist-sheet-scrim"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.scrim, { opacity: sheetScrim }]}
      />
      <Animated.View
        testID="playlist-sheet"
        style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}
        {...pull.panHandlers}>
        {body}
      </Animated.View>
    </View>
  );

  if (playlist.isPending) {
    return sheet(
      <SafeAreaView
        testID="playlist-screen"
        style={styles.screen}
        edges={['top', 'left', 'right']}>
        <PlaylistIdentitySkeleton />
        <View style={[styles.skeletonBody, styles.column]}>
          <PlaylistControlsSkeleton />
          <TrackListSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (playlist.isError) {
    const notFound =
      playlist.error instanceof ApiError && playlist.error.status === 404;

    return sheet(
      <SafeAreaView
        testID="playlist-screen"
        style={styles.screen}
        edges={['top', 'left', 'right']}>
        <View style={[styles.stateBody, styles.column]}>
          {notFound ? (
            <PlaylistNotFound onBack={leaveDetail} />
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

  /* The state line's cell is the detail's sync; the menu does not repeat it. */
  const headerActions = playlistActionsFor(data, { includePin: false }).filter(
    action => action.key !== 'sync'
  );

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
      onError: error =>
        setHeaderProblem(problemMessage(error, t('detail.settingFailed')))
    });
  };

  /* The picker holds only the gallery's first page, so a long library costs one
   * read; the detail's own playlist may fall past it and is still led. */
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
  /* The floating action owns the bottom-right, so a notice clears its height; the
   * bar owns the bottom first, so both clear that too. */
  const playerOffset = currentId === null ? 0 : barHeight;
  const floatingOffset =
    (canWritePlaylist(data) ? actionDialSize + tokenLength('space-3') : 0) +
    playerOffset;

  const openAdd = (): void => {
    addTrack.reset();
    setAddOpen(true);
  };

  const closeAdd = (): void => {
    setAddOpen(false);
    addTrack.reset();
  };

  /* The header's and the dial's sync share one verb: a refusal lands in the
   * same slot. */
  const syncFromDial = (): void => {
    sync.mutate(data.id, {
      onError: error => {
        setHeaderProblem(problemMessage(error, t('library.syncFailed')));
      }
    });
  };

  /* A failed cancel keeps the run syncing; the notice carries the problem. */
  const cancelRunningSync = (): void => {
    cancelSync.mutate(data.id, {
      onError: error => {
        setNotice({
          message: t('syncSummary.cancelFailed'),
          detail: problemDetail(
            t,
            error instanceof ApiError ? error.problem : null
          )
        });
      }
    });
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
        remoteRemoved={tracks.remoteRemoved ?? 0}
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
        onCancel={
          canWritePlaylist(data) &&
          latestRun.data?.status === SyncRunStatus.Running
            ? cancelRunningSync
            : undefined
        }
        cancelling={cancelSync.isPending && cancelSync.variables === data.id}
      />
    ) : null;

  const queueEmpty =
    queue.isSuccess && playableTracks(queue.data?.items ?? []).length === 0;

  const startPlaylist = async (intent: StartIntent): Promise<void> => {
    setStarting(intent);

    const refusal = await startAtPlaylist(client, data, intent);

    setStarting(null);

    if (refusal === null) {
      return;
    }

    if (refusal.kind === 'empty') {
      setNotice({
        message: t('start.empty', { name: data.name }),
        detail: t('start.emptyDetail')
      });
      return;
    }

    setNotice({
      message: t('start.unreachable', { name: data.name }),
      detail:
        problemDetail(
          t,
          refusal.error instanceof ApiError ? refusal.error.problem : null
        ) ?? t('start.unreachableDetail')
    });
  };

  /* One window at a time: a second action sends the first now rather than
   * losing its request. The window waits for its sheet to leave. */
  const deferPending = (
    action: PendingAction,
    kind: 'detail-track' | 'detail-playlist'
  ): void => {
    for (const window of deferred.windows) {
      if (window.kind?.startsWith('detail-')) {
        deferred.commit(window.key);
      }
    }

    deferred.defer(
      { ...action, kind },
      { started: false, graceMs: COMMIT_GRACE_MS }
    );
  };

  const startRemove = (target: PlaylistTrack): void => {
    deferPending(
      {
        id: target.track.id,
        message: t('detail.removeDeferred'),
        detail: target.track.title,
        commit: () =>
          removeTrack.mutate(target.track.id, {
            onError: error => {
              setNotice({
                message: problemMessage(error, t('detail.removeFailed')),
                detail: target.track.title
              });
            }
          })
      },
      'detail-track'
    );
  };

  const startDelete = (): void => {
    deferPending(
      {
        id: data.id,
        message: t('detail.deleteDeferred'),
        detail: data.name,
        commit: () =>
          deletePlaylist.mutate(data.id, {
            onSuccess: leaveDetail,
            onError: error => {
              setNotice({
                message: problemMessage(error, t('detail.deleteFailed')),
                detail: data.name
              });
            }
          })
      },
      'detail-playlist'
    );
  };

  const chooseHeaderAction = (key: PlaylistActionKey): void => {
    if (key === 'delete') {
      setHeaderOpen(false);
      setHeaderProblem(null);
      startDelete();
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

  const skipControl = (
    <Checkbox
      testID="detail-skip"
      label={t('skipSetting.label')}
      checked={data.skipNonMusic}
      disabled={!canWritePlaylist(data) || skipSetting.isPending}
      onChange={chooseSkip}
    />
  );

  const headerProps: PlaylistIdentityProps = {
    playlist: data,
    ownerName,
    config,
    syncing: syncInFlight,
    now,
    starting,
    shuffled: listShuffled,
    playing: isQueue && currentId !== null && isPlaying,
    onSync: canWritePlaylist(data) ? syncFromDial : undefined,
    onPlay: queueEmpty
      ? undefined
      : () => {
          if (isQueue && currentId !== null) {
            setPlaying(!isPlaying);
            return;
          }

          void startPlaylist('play');
        },
    onShuffle: queueEmpty
      ? undefined
      : () => {
          if (listShuffled) {
            setShuffle(false);
            return;
          }

          void startPlaylist('shuffle');
        },
    onOpenActions: openHeaderActions,
    onBack: leaveDetail
  };

  return sheet(
    <SafeAreaView
      testID="playlist-screen"
      style={styles.screen}
      edges={['top', 'left', 'right']}>
      <PlaylistIdentity
        {...headerProps}
        progress={headerProgress}
        collapsed={collapsed}
      />
      <FlatList
        ref={scroll}
        testID="playlist-scroll"
        data={
          tracks.isSuccess && !landing && !filterEmpty && data.trackCount > 0
            ? rows
            : []
        }
        keyExtractor={entry => entry.track.id}
        renderItem={({ item: entry }) => (
          <View testID={`track-slot-${entry.track.id}`}>
            <TrackRow
              association={entry}
              config={config}
              current={currentId === entry.track.id}
              playing={currentId === entry.track.id && isPlaying}
              onOpenActions={openActions}
              onPlay={playTrack}
            />
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            {showControls ? (
              <PlaylistControls
                sort={data.sort}
                canEdit={canWritePlaylist(data)}
                shuffled={listShuffled}
                saving={sort.isPending}
                counts={tracks.counts}
                remoteRemoved={tracks.remoteRemoved ?? 0}
                provider={data.provider}
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
                  {t(emptyFilterChip.empty, {
                    provider: providerLabel(t, data.provider)
                  })}
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
          </View>
        }
        ListFooterComponent={
          <>
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
          </>
        }
        extraData={`${currentId ?? ''}:${isPlaying}`}
        {...verticalListChrome}
        pointerEvents={pendingDelete ? 'none' : 'auto'}
        style={[
          styles.scroll,
          styles.column,
          pendingDelete ? styles.pending : undefined
        ]}
        onScroll={readScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom +
              tokenLength('space-4') +
              actionDialSize +
              tokenLength('space-3') +
              playerOffset
          }
        ]}
        initialNumToRender={12}
        windowSize={7}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollToIndexFailed={info => {
          scroll.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: false
          });
          setTimeout(() => {
            scroll.current?.scrollToIndex({
              index: info.index,
              animated: false,
              viewOffset: tokenLength('space-4')
            });
          }, 50);
        }}
      />
      {canWritePlaylist(data) ? (
        <ActionDial
          label={t('detail.fabActions')}
          testID="detail-fab"
          actions={[
            {
              key: 'add',
              testID: 'detail-add-track',
              label: t('detail.addTrack'),
              icon: 'add',
              onPress: openAdd
            },
            {
              key: 'sync',
              testID: 'detail-sync',
              label: syncInFlight
                ? t('detail.syncingPlaylist')
                : t('detail.syncPlaylist'),
              icon: 'sync',
              accent: true,
              busy: syncInFlight,
              onPress: syncFromDial
            }
          ]}
          busy={syncInFlight}
          bottomOffset={playerOffset}
          rightOffset={DIAL_RIGHT}
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
        onExited={() => deferred.startAll()}
      />
      <PlaylistActionsSheet
        playlistName={headerOpen ? data.name : null}
        actions={headerActions}
        problem={headerProblem}
        summary={band}
        extra={skipControl}
        onSelect={chooseHeaderAction}
        onExited={() => deferred.startAll()}
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
      {undoWindow === null ? null : (
        <UndoSnackbar
          key={undoWindow.key}
          message={undoWindow.message}
          detail={undoWindow.detail ?? ''}
          durationMs={undoWindowMs}
          bottomOffset={floatingOffset}
          horizontalInset={tokenLength('space-4')}
          onExpire={() => undefined}
          onUndo={() => deferred.cancel(undoWindow.key)}
        />
      )}
      {notice === null ? null : (
        <Notice
          message={notice.message}
          detail={notice.detail}
          onDismiss={() => setNotice(null)}
          bottomOffset={
            floatingOffset +
            (undoWindow === null
              ? 0
              : tokenLength('space-9') + tokenLength('space-4'))
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheetHost: {
    flex: 1
  },
  scrim: {
    backgroundColor: tokenColor('scrim')
  },
  sheet: {
    flex: 1,
    backgroundColor: tokenColor('bg')
  },
  screen: {
    flex: 1,
    backgroundColor: tokenColor('bg')
  },
  scroll: {
    flex: 1
  },
  column: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center'
  },
  content: {
    paddingHorizontal: tokenLength('space-4'),
    paddingTop: tokenLength('space-3'),
    gap: tokenLength('space-3')
  },
  header: {
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
    minHeight: touchTarget,
    justifyContent: 'center',
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
    fontWeight: tokenWeight('weight-semibold')
  },
  stateBody: {
    flex: 1,
    padding: tokenLength('space-4')
  },
  /* The rows hold the list's place under the head's skeleton, so the read lands
   * without the list moving. */
  skeletonBody: {
    gap: tokenLength('space-3'),
    paddingHorizontal: tokenLength('space-4'),
    paddingTop: tokenLength('space-3')
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
