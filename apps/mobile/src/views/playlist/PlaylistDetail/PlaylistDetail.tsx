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

import type { PlaylistTrack } from '@playliberty/contracts';
import {
  AddTrackOutcome,
  PlaylistSort,
  PlaylistSyncStatus,
  SyncRunStatus,
  TrackFileStatus
} from '@playliberty/contracts';
import { problemDetail, useI18n } from '@playliberty/i18n';
import { standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../../shared/a11y/useReduceMotion';
import { copyText } from '../../../shared/clipboard/copyText';
import ActionDial, {
  actionDialSize
} from '../../../shared/components/ActionDial/ActionDial';
import Checkbox from '../../../shared/components/Checkbox/Checkbox';
import Notice from '../../../shared/components/Notice/Notice';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import Spinner from '../../../shared/components/Spinner/Spinner';
import UndoSnackbar from '../../../shared/components/UndoSnackbar/UndoSnackbar';
import { isPlayable } from '../../../shared/playable/playable';
import { canWritePlaylist } from '../../../shared/playlistAccess/canWritePlaylist';
import { MAX_CONTENT_WIDTH } from '../../../shared/styles/contentColumn/contentColumn';
import {
  fontFamily,
  tokenColor,
  tokenDuration,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../../shared/styles/tokens';
import { cannotPlayNotice } from '../../../shared/trackLinkNotice/trackLinkNotice';
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
import { usePlayerBarHeight } from '../../../player/playerBarSize/PlayerBarSizeContext';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import { playerTracks } from '../../../player/playerTrack/playerTrack';
import { orderTracksByQueue } from '../../../player/queueOrder/queueOrder';
import {
  type StartIntent,
  startPlaylistPlayback
} from '../../../player/startPlaylistPlayback/startPlaylistPlayback';
import CoverSheet from '../../library/CoverSheet/CoverSheet';
import PlaylistActionsSheet from '../../library/PlaylistActionsSheet/PlaylistActionsSheet';
import RenameSheet from '../../library/RenameSheet/RenameSheet';
import ShareSheet from '../../library/ShareSheet/ShareSheet';
import {
  type PlaylistActionKey,
  UNDO_WINDOW_MS,
  playlistActionsFor
} from '../../library/playlistActions/playlistActions';
import { holdLeftPlaylistNotice } from '../../track/leftPlaylistNotice/leftPlaylistNotice';
import AddTrackSheet from '../AddTrackSheet/AddTrackSheet';
import PlaylistControls, {
  PlaylistControlsSkeleton
} from '../PlaylistControls/PlaylistControls';
import PlaylistEmpty from '../PlaylistEmpty/PlaylistEmpty';
import PlaylistIdentity, {
  HEADER_HEIGHT,
  type PlaylistIdentityProps,
  PlaylistIdentitySkeleton
} from '../PlaylistIdentity/PlaylistIdentity';
import PlaylistNotFound from '../PlaylistNotFound/PlaylistNotFound';
import SyncBand from '../SyncBand/SyncBand';
import TrackActionsSheet from '../TrackActionsSheet/TrackActionsSheet';
import {
  type TrackActionKey,
  trackActionsFor
} from '../TrackActionsSheet/trackActions/trackActions';
import TrackListSkeleton from '../TrackListSkeleton/TrackListSkeleton';
import TrackRow from '../TrackRow/TrackRow';
import { claimsPull, commitsPull } from './pullDismiss';

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
/* The scroll that takes the header from wide to narrow. */
const COLLAPSE_DISTANCE = tokenLength('space-9') * 2;

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

/* The detail's read surface. The identity block and the rows are one scroll, so
 * the cover leaves the screen as the list is walked. Each read outcome owns one
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
  const window = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const barHeight = usePlayerBarHeight();
  /* The sheet's offset, which only the drag moves: the route owns the entry
   * and the exit. */
  const sheetY = useRef(new Animated.Value(0)).current;
  const pullOffset = useRef(0);
  const headerEdge = useRef(0);
  const playlist = usePlaylist(playlistId);
  const playlists = usePlaylists();
  const [filter, setFilter] = useState<TrackFileStatus | null>(null);
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
  const [pendingWindow, setPendingWindow] = useState(0);
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
  const [collapsed, setCollapsed] = useState(false);
  /* The header's lower edge follows its own state, so a pull that starts on it
   * is told apart from one on the list under it. */
  useEffect(() => {
    headerEdge.current =
      insets.top + (collapsed ? HEADER_HEIGHT.narrow : HEADER_HEIGHT.wide);
  }, [collapsed, insets.top]);
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
  const pendingDelete = pending?.kind === 'delete';
  const start = usePlayerStore(state => state.start);
  const play = usePlayerStore(state => state.play);
  const applyRefetch = usePlayerStore(state => state.applyRefetch);
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

  /* A 404 on an open playlist with a track link is the bare track, silently:
   * the access model never confirms that the playlist exists. A network or
   * server failure keeps the detail's normal read failure. */
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

  /* A shared link enters the playlist once its reads land: another queue
   * starts this playlist at the track, this queue jumps to it, and the same
   * track is a no-op so a repeated link neither restarts nor seeks. A track
   * that left the playlist leaves for the bare route with its notice; one that
   * cannot play stays here and says why. */
  useEffect(() => {
    if (enteredLink.current || linkTarget === null) {
      return;
    }

    if (playlistData === undefined || !queue.isSuccess) {
      return;
    }

    const items = queue.data?.items ?? [];
    const association = items.find(entry => entry.track.id === linkTarget);

    enteredLink.current = true;
    setLinkSettled(true);

    if (association === undefined) {
      redirectingLink.current = true;
      holdLeftPlaylistNotice();
      onBareTrackRedirect?.(linkTarget);
      return;
    }

    if (!isPlayable(association.track)) {
      setNotice(cannotPlayNotice(association.track, t));
      return;
    }

    if (playerPlaylistId === playlistData.id) {
      if (currentId !== linkTarget && playerQueue.includes(linkTarget)) {
        play(linkTarget);
      }

      return;
    }

    start(
      playerTracks(items.filter(entry => isPlayable(entry.track))),
      {
        id: playlistData.id,
        name: playlistData.name,
        coverUpdatedAt: playlistData.coverUpdatedAt,
        coverTrackId: playlistData.coverTrackId
      },
      linkTarget,
      false
    );
  }, [
    currentId,
    linkTarget,
    onBareTrackRedirect,
    play,
    playerPlaylistId,
    playerQueue,
    playlistData,
    queue.data,
    queue.isSuccess,
    start,
    t
  ]);

  /* The address names the playing track while this detail is the queue, and
   * names none while it is not. A link's target holds its place until entry
   * settles, so the read does not erase the parameter first. */
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

  /* The header chases the list's offset on its own frames: the scroll events set
   * the target, and the loop keeps the motion even when those events are thin.
   * Reduced motion drops the tween and tracks the target on the event itself. */
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
          if (reduceMotion) {
            return;
          }

          sheetY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_event, gesture) => {
          if (commitsPull(gesture.dy, gesture.vy)) {
            leaveDetail();
            return;
          }

          settleSheet();
        },
        onPanResponderTerminate: settleSheet
      }),
    [leaveDetail, reduceMotion, settleSheet, sheetY]
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

  const startPlaylist = async (intent: StartIntent): Promise<void> => {
    setStarting(intent);

    const refusal = await startPlaylistPlayback(
      data,
      intent,
      readPlayableQueue
    );

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
      onSuccess: leaveDetail,
      onError: error => {
        setNotice({
          message: problemMessage(error, t('detail.deleteFailed')),
          detail: action.detail
        });
      }
    });
  };

  /* The snackbar owns the window, so a pause or an extension moves the commit
   * with the bar. */
  const expirePending = (): void => {
    if (pending === null) {
      return;
    }

    const action = pending;
    setPending(null);
    commitPending(action);
  };

  /* One window at a time: a second action sends the first now rather than
   * losing its request, then opens its own countdown. */
  const startPending = (next: PendingAction): void => {
    if (pending !== null) {
      commitPending(pending);
    }

    if (next.kind === 'remove') {
      hideTrack(next.trackId);
    }

    setPending(next);
    setPendingWindow(current => current + 1);
  };

  const undoPending = (): void => {
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
        showsVerticalScrollIndicator={false}
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
          rightOffset={tokenLength('space-4')}
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
        summary={band}
        extra={skipControl}
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
          key={`${pending.kind === 'remove' ? pending.trackId : 'delete'}:${pendingWindow}`}
          message={pending.message}
          detail={pending.detail}
          durationMs={undoWindowMs}
          bottomOffset={floatingOffset}
          horizontalInset={tokenLength('space-4')}
          onExpire={expirePending}
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
