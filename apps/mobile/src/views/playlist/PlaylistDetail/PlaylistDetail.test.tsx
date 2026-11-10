import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react-native';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  PanResponder
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type * as ApiClientModule from '@playliberty/api-client';
import {
  ApiError,
  readPlaylistQueue,
  useAccountDirectory,
  useAccountPage,
  useAddTrack,
  useCancelSyncPlaylist,
  useCurrentAccount,
  useDeletePlaylist,
  useFetchTrackWhole,
  useGrantShare,
  useLatestSyncRun,
  usePlaylist,
  usePlaylistQueue,
  usePlaylistShares,
  usePlaylistTracks,
  usePlaylists,
  useRemovePlaylistCover,
  useRemoveTrack,
  useRenamePlaylist,
  useRetryFailedTracks,
  useRetryTrack,
  useRevokeShare,
  useSetPlaylistCover,
  useSyncPlaylist,
  useUpdateSkipNonMusic,
  useUpdateSort
} from '@playliberty/api-client';
import {
  type AccountSummary,
  AddTrackOutcome,
  type AddTrackResult,
  AssociationOrigin,
  FailureKind,
  type Playlist,
  PlaylistSort,
  PlaylistSyncStatus,
  type PlaylistTrack,
  ProblemCode,
  Provider,
  REMOTE_REMOVED,
  ShareLevel,
  type SyncRun,
  SyncRunStatus,
  TrackFileStatus,
  type TrackFilterState,
  TrackSourceStatus
} from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';
import { resetDeferredActions } from '@playliberty/library';

import { copyText } from '../../../shared/copyText';
import {
  tokenDuration,
  tokenLength,
  tokenNumber
} from '../../../shared/styles/tokens/tokens';

import type { ApiConfig } from '../../../auth/useApiConfig/useApiConfig';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import { takeLeftPlaylistNotice } from '../../track/leftPlaylistNotice';
import PlaylistDetail from './PlaylistDetail';

jest.mock('@playliberty/api-client', () => ({
  ...jest.requireActual<typeof ApiClientModule>('@playliberty/api-client'),
  readPlaylistQueue: jest.fn(),
  useAccountDirectory: jest.fn(),
  useAccountPage: jest.fn(),
  useAddTrack: jest.fn(),
  useCancelSyncPlaylist: jest.fn(),
  useCurrentAccount: jest.fn(),
  useDeletePlaylist: jest.fn(),
  useFetchTrackWhole: jest.fn(),
  useGrantShare: jest.fn(),
  useLatestSyncRun: jest.fn(),
  usePlaylist: jest.fn(),
  usePlaylistQueue: jest.fn(),
  usePlaylistShares: jest.fn(),
  usePlaylistTracks: jest.fn(),
  usePlaylists: jest.fn(),
  useRemovePlaylistCover: jest.fn(),
  useRemoveTrack: jest.fn(),
  useRenamePlaylist: jest.fn(),
  useRetryFailedTracks: jest.fn(),
  useRetryTrack: jest.fn(),
  useRevokeShare: jest.fn(),
  useSetPlaylistCover: jest.fn(),
  useSyncPlaylist: jest.fn(),
  useUpdateSkipNonMusic: jest.fn(),
  useUpdateSort: jest.fn()
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn()
}));
jest.mock('expo-file-system', () => ({
  File: class {
    readonly uri: string;
    readonly size = 0;

    constructor(uri: string) {
      this.uri = uri;
    }
  }
}));
jest.mock('../../../shared/copyText', () => ({
  copyText: jest.fn()
}));

const usePlaylistMock = usePlaylist as jest.MockedFunction<typeof usePlaylist>;
const usePlaylistTracksMock = usePlaylistTracks as jest.MockedFunction<
  typeof usePlaylistTracks
>;
const usePlaylistQueueMock = usePlaylistQueue as jest.MockedFunction<
  typeof usePlaylistQueue
>;
const usePlaylistsMock = usePlaylists as jest.MockedFunction<
  typeof usePlaylists
>;
const useAddTrackMock = useAddTrack as jest.MockedFunction<typeof useAddTrack>;
const useCancelSyncPlaylistMock = useCancelSyncPlaylist as jest.MockedFunction<
  typeof useCancelSyncPlaylist
>;
const useLatestSyncRunMock = useLatestSyncRun as jest.MockedFunction<
  typeof useLatestSyncRun
>;
const useSyncPlaylistMock = useSyncPlaylist as jest.MockedFunction<
  typeof useSyncPlaylist
>;
const useRetryTrackMock = useRetryTrack as jest.MockedFunction<
  typeof useRetryTrack
>;
const useFetchTrackWholeMock = useFetchTrackWhole as jest.MockedFunction<
  typeof useFetchTrackWhole
>;
const useRemoveTrackMock = useRemoveTrack as jest.MockedFunction<
  typeof useRemoveTrack
>;
const useRenamePlaylistMock = useRenamePlaylist as jest.MockedFunction<
  typeof useRenamePlaylist
>;
const usePlaylistSharesMock = usePlaylistShares as jest.MockedFunction<
  typeof usePlaylistShares
>;
const useRevokeShareMock = useRevokeShare as jest.MockedFunction<
  typeof useRevokeShare
>;
const readPlaylistQueueMock = readPlaylistQueue as jest.MockedFunction<
  typeof readPlaylistQueue
>;
const useDeletePlaylistMock = useDeletePlaylist as jest.MockedFunction<
  typeof useDeletePlaylist
>;
const useUpdateSortMock = useUpdateSort as jest.MockedFunction<
  typeof useUpdateSort
>;
const useUpdateSkipNonMusicMock = useUpdateSkipNonMusic as jest.MockedFunction<
  typeof useUpdateSkipNonMusic
>;
const useRetryFailedTracksMock = useRetryFailedTracks as jest.MockedFunction<
  typeof useRetryFailedTracks
>;
const copyTextMock = copyText as jest.MockedFunction<typeof copyText>;
const useAccountDirectoryMock = useAccountDirectory as jest.MockedFunction<
  typeof useAccountDirectory
>;

const store = { getItem: () => null, setItem: () => {} };
const hidden = { includeHiddenElements: true };

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

const config: ApiConfig = {
  baseUrl: 'https://instance.test',
  token: { id: 'token-id', secret: 'token-secret' }
};

const now = new Date('2026-10-01T12:00:00.000Z');

const playlist: Playlist = {
  id: 'playlist-1',
  ownerAccountId: 'account-1',
  name: 'Rain On The Window',
  coverTrackId: 'track-1',
  coverUpdatedAt: '2026-10-01T00:00:00.000Z',
  provider: Provider.Youtube,
  sourcePlaylistId: 'PL-demo',
  syncStatus: PlaylistSyncStatus.Idle,
  lastSyncedAt: '2026-09-29T12:00:00.000Z',
  trackCount: 12,
  skipNonMusic: true,
  sort: PlaylistSort.Playlist,
  access: 'owner',
  hasShares: false,
  pinned: false,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z'
};

const neverSynced: Playlist = {
  ...playlist,
  lastSyncedAt: null,
  trackCount: 0
};

const syncedEmpty: Playlist = {
  ...playlist,
  trackCount: 0
};

const writableOther: Playlist = {
  ...playlist,
  id: 'playlist-2',
  name: 'Late Night Jazz',
  access: ShareLevel.Write
};

const readOnlyOther: Playlist = {
  ...playlist,
  id: 'playlist-3',
  name: 'Shared read',
  access: ShareLevel.Read
};

const galleryPage = {
  items: [playlist, writableOther, readOnlyOther],
  total: 3,
  limit: 200,
  offset: 0
};

const track: PlaylistTrack = {
  track: {
    id: 'track-1',
    provider: Provider.Youtube,
    videoId: 'video-1',
    title: 'First Song',
    durationSeconds: 182,
    skipNonMusic: false,
    thumbnailPath: null,
    fileStatus: TrackFileStatus.Stored,
    sourceStatus: TrackSourceStatus.Available,
    failureKind: null,
    failureReason: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  },
  origin: AssociationOrigin.Remote,
  position: 0
};

const failedTrack: PlaylistTrack = {
  ...track,
  track: {
    ...track.track,
    fileStatus: TrackFileStatus.Failed,
    failureKind: FailureKind.Network,
    failureReason: 'yt-dlp: HTTP 403'
  }
};

const secondTrack: PlaylistTrack = {
  ...track,
  track: { ...track.track, id: 'track-2', title: 'Second Song' }
};

const thirdTrack: PlaylistTrack = {
  ...track,
  track: { ...track.track, id: 'track-3', title: 'Third Song' }
};

const counts = {
  [TrackFileStatus.Stored]: 1,
  [TrackFileStatus.Pending]: 0,
  [TrackFileStatus.Downloading]: 0,
  [TrackFileStatus.Failed]: 0,
  [TrackFileStatus.Unavailable]: 0
};

const emptyCounts = {
  [TrackFileStatus.Stored]: 0,
  [TrackFileStatus.Pending]: 0,
  [TrackFileStatus.Downloading]: 0,
  [TrackFileStatus.Failed]: 0,
  [TrackFileStatus.Unavailable]: 0
};

const page = {
  items: [track],
  total: 1,
  limit: 100,
  offset: 0,
  counts,
  remoteRemoved: 0
};

/* The Failed chip is hidden at zero, so tests that press it start from a page
 * whose whole counts include one failed track. */
const pageWithFailed = {
  ...page,
  counts: { ...counts, [TrackFileStatus.Failed]: 1 }
};

const pageWithRetained = {
  ...page,
  remoteRemoved: 1
};

const emptyPage = {
  items: [],
  total: 0,
  limit: 100,
  offset: 0,
  counts: emptyCounts,
  remoteRemoved: 0
};

const completedRun: SyncRun = {
  id: 'run-1',
  playlistId: 'playlist-1',
  status: SyncRunStatus.Completed,
  addedCount: 2,
  retainedCount: 3,
  removedCount: 1,
  failedCount: 0,
  startedAt: '2026-09-29T11:59:00.000Z',
  finishedAt: '2026-09-29T12:00:00.000Z',
  error: null
};

const runningRun: SyncRun = {
  ...completedRun,
  status: SyncRunStatus.Running,
  addedCount: 0,
  retainedCount: 0,
  removedCount: 0,
  finishedAt: null
};

const bea: AccountSummary = {
  id: 'account-2',
  displayName: 'Bea',
  avatarUrl: null
};

const notFound = new ApiError(404, {
  type: 'about:blank',
  title: 'Playlist not found',
  status: 404,
  code: ProblemCode.PlaylistNotFound,
  detail: 'The playlist does not exist.'
});

const playlistFailure = new ApiError(503, {
  type: 'about:blank',
  title: 'Service unavailable',
  status: 503,
  code: ProblemCode.InternalError,
  detail: 'The playlist is unavailable.'
});

const tracksFailure = new ApiError(503, {
  type: 'about:blank',
  title: 'Service unavailable',
  status: 503,
  code: ProblemCode.InternalError,
  detail: 'The tracks are unavailable.'
});

function queryResult<T>(data: T, overrides: Record<string, unknown> = {}) {
  return {
    data,
    isPending: false,
    isSuccess: true,
    isError: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
    ...overrides
  } as never;
}

function mutationResult(overrides: Record<string, unknown> = {}) {
  return {
    mutate: jest.fn(),
    reset: jest.fn(),
    isPending: false,
    isSuccess: false,
    error: null,
    ...overrides
  } as never;
}

interface GalleryPage {
  readonly items: readonly Playlist[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

interface RenderOptions {
  readonly playlist?: Playlist;
  readonly gallery?: GalleryPage;
  readonly tracks?: typeof page;
  readonly filteredTracks?: Partial<Record<TrackFilterState, typeof page>>;
  readonly queue?: readonly PlaylistTrack[];
  readonly trackId?: string | null;
  readonly queueError?: Error;
  readonly queuePending?: boolean;
  readonly latestRun?: SyncRun | null;
  readonly directory?: readonly AccountSummary[];
  readonly language?: Language;
  readonly pending?: boolean;
  readonly tracksPending?: boolean;
  readonly playlistError?: Error;
  readonly tracksError?: Error;
  readonly hasMore?: boolean;
  readonly fetchingNextPage?: boolean;
  readonly fetchNextPageError?: boolean;
  readonly syncPending?: boolean;
  readonly cancelError?: Error;
  readonly addPending?: boolean;
  readonly addResult?: AddTrackResult;
  readonly sortPending?: boolean;
  readonly skipPending?: boolean;
  readonly renamePending?: boolean;
  readonly retryFailedPending?: boolean;
  readonly retryPending?: boolean;
  readonly retryVariables?: string;
  readonly fetchPending?: boolean;
  readonly fetchVariables?: string;
  readonly undoWindowMs?: number;
  readonly onBack?: () => void;
}

async function reportViewable(keys: readonly string[]) {
  await act(() => {
    screen.getByTestId('playlist-scroll').props.onViewableItemsChanged({
      viewableItems: keys.map(key => ({
        key,
        index: null,
        isViewable: true,
        item: null
      })),
      changed: []
    });
  });
}

/* The pull's responder is rebuilt whenever its motion answer changes, so the
 * latest config is the one a release uses; its capture hook tells it apart. */
function capturePull() {
  let release: ((event: object, gesture: object) => void) | null = null;
  const create = PanResponder.create.bind(PanResponder);

  jest.spyOn(PanResponder, 'create').mockImplementation(config => {
    if (config.onMoveShouldSetPanResponderCapture !== undefined) {
      release = config.onPanResponderRelease as unknown as typeof release;
    }

    return create(config);
  });

  return () => release;
}

async function renderDetail(options: RenderOptions = {}) {
  const onBack = options.onBack ?? jest.fn();
  const onAddressChange = jest.fn();
  const onBareTrackRedirect = jest.fn();
  const playlistRefetch = jest.fn();
  const tracksRefetch = jest.fn();
  const tracksFetchNextPage = jest.fn();
  const syncMutate = jest.fn();
  const cancelMutate = jest.fn(
    (
      _playlistId: string,
      mutationOptions?: { onError?: (error: Error) => void }
    ) => {
      if (options.cancelError !== undefined) {
        mutationOptions?.onError?.(options.cancelError);
      }
    }
  );
  const retryMutate = jest.fn();
  const fetchWholeMutate = jest.fn();
  const removeMutate = jest.fn();
  const deleteMutate = jest.fn();
  const renameMutate = jest.fn();
  jest.mocked(useSetPlaylistCover).mockReturnValue(mutationResult());
  jest.mocked(useRemovePlaylistCover).mockReturnValue(mutationResult());
  usePlaylistSharesMock.mockReturnValue(queryResult([]));
  useRevokeShareMock.mockReturnValue(mutationResult());
  jest.mocked(useCurrentAccount).mockReturnValue(
    queryResult({
      id: 'account-me',
      displayName: 'Owner',
      email: null,
      avatarUrl: null,
      role: 'user'
    })
  );
  jest.mocked(useAccountPage).mockReturnValue({
    items: [],
    isPending: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    error: null,
    hasMore: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn()
  } as never);
  jest.mocked(useGrantShare).mockReturnValue(mutationResult());
  const sortMutate = jest.fn();
  const skipMutate = jest.fn();
  const addMutate = jest.fn();
  const retryFailedMutate = jest.fn();
  const queueItems = options.queue ?? [track];

  usePlaylistMock.mockReturnValue(
    options.playlistError === undefined
      ? queryResult(
          options.pending === true ? undefined : (options.playlist ?? playlist),
          options.pending === true
            ? { isPending: true, isSuccess: false, data: undefined }
            : {}
        )
      : queryResult(undefined, {
          isPending: false,
          isSuccess: false,
          isError: true,
          error: options.playlistError,
          refetch: playlistRefetch
        })
  );
  const tracksRead = (
    data: typeof page,
    overrides: Record<string, unknown> = {}
  ) =>
    ({
      items: data.items,
      counts: data.counts,
      remoteRemoved: data.remoteRemoved,
      total: data.total,
      isPending: false,
      isError: false,
      isSuccess: true,
      isFetching: false,
      isPlaceholderData: false,
      error: null,
      hasMore: options.hasMore === true,
      isFetchingNextPage: options.fetchingNextPage === true,
      isFetchNextPageError: options.fetchNextPageError === true,
      fetchNextPage: tracksFetchNextPage,
      refetch: tracksRefetch,
      ...overrides
    }) as never;
  const pageFor = (state?: TrackFilterState) => {
    const filtered =
      state === undefined ? undefined : options.filteredTracks?.[state];

    return filtered ?? options.tracks ?? page;
  };

  usePlaylistTracksMock.mockImplementation((_id, state) =>
    options.tracksError !== undefined
      ? tracksRead(emptyPage, {
          isSuccess: false,
          isError: true,
          error: options.tracksError
        })
      : options.tracksPending === true
        ? tracksRead(emptyPage, { isPending: true, isSuccess: false })
        : tracksRead(pageFor(state))
  );
  usePlaylistQueueMock.mockReturnValue(
    options.queueError !== undefined
      ? queryResult(undefined, {
          isPending: false,
          isSuccess: false,
          isError: true,
          error: options.queueError,
          refetch: jest.fn()
        })
      : options.queuePending === true
        ? queryResult(undefined, {
            isPending: true,
            isSuccess: false,
            isError: false,
            data: undefined,
            refetch: jest.fn()
          })
        : queryResult({ items: queueItems })
  );
  readPlaylistQueueMock.mockImplementation(() => {
    if (options.queueError !== undefined) {
      return Promise.reject(options.queueError);
    }

    if (options.queuePending === true) {
      return new Promise(() => {});
    }

    return Promise.resolve([...queueItems]);
  });
  usePlaylistsMock.mockReturnValue(queryResult(options.gallery ?? galleryPage));
  useLatestSyncRunMock.mockReturnValue(queryResult(options.latestRun ?? null));
  useAccountDirectoryMock.mockReturnValue(queryResult(options.directory ?? []));
  useSyncPlaylistMock.mockReturnValue(
    mutationResult({
      mutate: syncMutate,
      isPending: options.syncPending === true
    })
  );
  useCancelSyncPlaylistMock.mockReturnValue(
    mutationResult({ mutate: cancelMutate })
  );
  useAddTrackMock.mockReturnValue(
    mutationResult({
      mutate: addMutate,
      isPending: options.addPending === true,
      data: options.addResult
    })
  );
  useRetryTrackMock.mockReturnValue(
    mutationResult({
      mutate: retryMutate,
      isPending: options.retryPending === true,
      variables: options.retryVariables
    })
  );
  useFetchTrackWholeMock.mockReturnValue(
    mutationResult({
      mutate: fetchWholeMutate,
      isPending: options.fetchPending === true,
      variables: options.fetchVariables
    })
  );
  useRemoveTrackMock.mockReturnValue(mutationResult({ mutate: removeMutate }));
  useDeletePlaylistMock.mockReturnValue(
    mutationResult({ mutate: deleteMutate })
  );
  useRenamePlaylistMock.mockReturnValue(
    mutationResult({
      mutate: renameMutate,
      isPending: options.renamePending === true
    })
  );
  useUpdateSortMock.mockReturnValue(
    mutationResult({
      mutate: sortMutate,
      isPending: options.sortPending === true
    })
  );
  useUpdateSkipNonMusicMock.mockReturnValue(
    mutationResult({
      mutate: skipMutate,
      isPending: options.skipPending === true
    })
  );
  useRetryFailedTracksMock.mockReturnValue(
    mutationResult({
      mutate: retryFailedMutate,
      isPending: options.retryFailedPending === true
    })
  );

  const queryClient = new QueryClient();
  const view = await render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider
        initialLanguage={options.language ?? Language.English}
        storage={store}>
        <SafeAreaProvider initialMetrics={metrics}>
          <PlaylistDetail
            config={config}
            playlistId="playlist-1"
            trackId={options.trackId ?? null}
            onAddressChange={onAddressChange}
            onBareTrackRedirect={onBareTrackRedirect}
            onBack={onBack}
            now={now}
            undoWindowMs={options.undoWindowMs}
          />
        </SafeAreaProvider>
      </I18nProvider>
    </QueryClientProvider>
  );

  return {
    onBack,
    onAddressChange,
    onBareTrackRedirect,
    playlistRefetch,
    tracksRefetch,
    tracksFetchNextPage,
    syncMutate,
    cancelMutate,
    retryMutate,
    fetchWholeMutate,
    removeMutate,
    deleteMutate,
    renameMutate,
    sortMutate,
    skipMutate,
    addMutate,
    retryFailedMutate,
    view
  };
}

beforeEach(() => {
  jest.useFakeTimers({
    doNotFake: ['Date', 'nextTick', 'performance', 'queueMicrotask']
  });
  jest.restoreAllMocks();
  jest.clearAllMocks();
  copyTextMock.mockReset();
  takeLeftPlaylistNotice();
  resetDeferredActions();
  usePlayerStore.getState().clear();
});

/* The virtualized list batches its next cell render on a timer, so its update
 * would land after this test's act scope. Settle it while the tree still is. */
afterEach(async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  resetDeferredActions();
  jest.useRealTimers();
});

describe('a shared track link', () => {
  function startPlaylistAt(trackId: string) {
    usePlayerStore.getState().start(
      [
        {
          id: 'track-1',
          title: 'First Song',
          durationSeconds: 182,
          thumbnailPath: null
        },
        {
          id: 'track-2',
          title: 'Second Song',
          durationSeconds: 182,
          thumbnailPath: null
        }
      ],
      { id: 'playlist-1', name: 'Rain On The Window' },
      trackId
    );
  }

  it('starts the playlist at the link track when another queue plays', async () => {
    usePlayerStore.getState().start(
      [
        {
          id: 'other-1',
          title: 'Other',
          durationSeconds: 100,
          thumbnailPath: null
        }
      ],
      { id: 'other-playlist', name: 'Other' },
      'other-1'
    );

    const { onAddressChange } = await renderDetail({
      trackId: 'track-2',
      queue: [track, secondTrack]
    });

    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBe('track-2');
    });
    const player = usePlayerStore.getState();

    expect(player.playlistId).toBe('playlist-1');
    expect(player.queue).toEqual(['track-1', 'track-2']);
    expect(player.shuffle).toBe(false);
    expect(player.isPlaying).toBe(true);
    expect(onAddressChange).toHaveBeenLastCalledWith('track-2');
  });

  it('asks for the page holding the link track when it is not loaded', async () => {
    const { tracksFetchNextPage } = await renderDetail({
      trackId: 'track-2',
      hasMore: true,
      queue: [track, secondTrack]
    });

    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBe('track-2');
    });
    await waitFor(() => {
      expect(tracksFetchNextPage).toHaveBeenCalled();
    });
  });

  it('jumps to the link track in the queue it is already in', async () => {
    startPlaylistAt('track-1');
    usePlayerStore.getState().setPosition(30);

    await renderDetail({
      trackId: 'track-2',
      queue: [track, secondTrack]
    });

    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBe('track-2');
    });
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
    expect(usePlayerStore.getState().queue).toEqual(['track-1', 'track-2']);
  });

  it('neither restarts nor seeks when the link names the current track', async () => {
    startPlaylistAt('track-1');
    usePlayerStore.getState().setPosition(30);
    usePlayerStore.getState().setPlaying(false);

    await renderDetail({
      trackId: 'track-1',
      queue: [track, secondTrack]
    });

    await waitFor(() => {
      expect(screen.getByTestId('playlist-screen')).toBeOnTheScreen();
    });
    expect(usePlayerStore.getState().currentId).toBe('track-1');
    expect(usePlayerStore.getState().positionSeconds).toBe(30);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('does not start a queue for a plain detail path', async () => {
    const { onAddressChange } = await renderDetail();

    expect(usePlayerStore.getState().currentId).toBeNull();
    expect(onAddressChange).toHaveBeenLastCalledWith(null);
  });

  it('mirrors the playing track while the detail is the queue', async () => {
    startPlaylistAt('track-1');
    const { onAddressChange } = await renderDetail({
      queue: [track, secondTrack]
    });

    await waitFor(() => {
      expect(onAddressChange).toHaveBeenLastCalledWith('track-1');
    });

    await act(async () => {
      usePlayerStore.getState().skipNext();
    });

    await waitFor(() => {
      expect(onAddressChange).toHaveBeenLastCalledWith('track-2');
    });
  });

  it('leaves for the bare track when the playlist is gone', async () => {
    const { onBareTrackRedirect } = await renderDetail({
      trackId: 'track-2',
      playlistError: notFound
    });

    await waitFor(() => {
      expect(onBareTrackRedirect).toHaveBeenCalledWith('track-2');
    });
    expect(usePlayerStore.getState().currentId).toBeNull();
  });

  it('keeps the read failure when the playlist read is not a not-found', async () => {
    const { onBareTrackRedirect } = await renderDetail({
      trackId: 'track-2',
      playlistError: playlistFailure
    });

    await act(async () => {});
    expect(onBareTrackRedirect).not.toHaveBeenCalled();
  });

  it('leaves for the bare track when the track left the playlist', async () => {
    const { onBareTrackRedirect } = await renderDetail({
      trackId: 'track-3',
      queue: [track, secondTrack]
    });

    await waitFor(() => {
      expect(onBareTrackRedirect).toHaveBeenCalledWith('track-3');
    });
    expect(takeLeftPlaylistNotice()).toBe(true);
    expect(usePlayerStore.getState().currentId).toBeNull();
  });

  it('keeps the playlist and explains a track that cannot play', async () => {
    const { onBareTrackRedirect } = await renderDetail({
      trackId: 'track-1',
      queue: [failedTrack, secondTrack]
    });

    await waitFor(() => {
      expect(screen.getByText('First Song cannot play.')).toBeOnTheScreen();
    });
    expect(screen.getByText('Its download failed.')).toBeOnTheScreen();
    expect(onBareTrackRedirect).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().currentId).toBeNull();
  });

  it('names no track when another queue plays', async () => {
    usePlayerStore.getState().start(
      [
        {
          id: 'other-1',
          title: 'Other',
          durationSeconds: 100,
          thumbnailPath: null
        }
      ],
      { id: 'other-playlist', name: 'Other' },
      'other-1'
    );

    const { onAddressChange, view } = await renderDetail({
      queue: [track, secondTrack]
    });

    await waitFor(() => {
      expect(onAddressChange).toHaveBeenLastCalledWith(null);
    });
    view.unmount();
  });
});

describe('the playlist detail', () => {
  it('draws the header above the list and the first rows in the scroll', async () => {
    await renderDetail();

    expect(screen.getByTestId('playlist-screen')).toBeOnTheScreen();

    const scroll = screen.getByTestId('playlist-scroll');

    expect(screen.getByTestId('playlist-identity')).toBeOnTheScreen();
    expect(within(scroll).getByTestId('track-row')).toBeOnTheScreen();
    expect(screen.getByText('Rain On The Window')).toBeOnTheScreen();
    expect(screen.getByText('12 tracks')).toBeOnTheScreen();
    expect(screen.getByText('Up to date')).toBeOnTheScreen();
    expect(screen.getByText('Synced 2 days ago')).toBeOnTheScreen();
    expect(screen.getByText('First Song', hidden)).toBeOnTheScreen();
    expect(screen.getByText('3:02', hidden)).toBeOnTheScreen();
  });

  it('draws the skip setting in the actions sheet and writes the flip', async () => {
    const { skipMutate } = await openHeaderSheet();
    const sheet = screen.getByTestId('playlist-actions-sheet');
    const setting = within(sheet).getByTestId('detail-skip');

    expect(setting.props.accessibilityState).toMatchObject({ checked: true });

    await fireEvent.press(setting);

    expect(skipMutate).toHaveBeenCalledWith(false, expect.any(Object));
  });

  it('keeps the skip setting, disabled, for a read collaborator', async () => {
    await openHeaderSheet({
      playlist: { ...playlist, access: ShareLevel.Read }
    });
    const sheet = screen.getByTestId('playlist-actions-sheet');

    expect(within(sheet).getByText('Skip non-music parts')).toBeOnTheScreen();
    expect(within(sheet).getByTestId('detail-skip')).toBeDisabled();
  });

  it('draws the sort and the chips under the header in one rail', async () => {
    await renderDetail();
    const scroll = screen.getByTestId('playlist-scroll');

    expect(screen.getByTestId('playlist-identity')).toBeOnTheScreen();
    expect(within(scroll).getByTestId('playlist-controls')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sort by: Playlist order')).toBeOnTheScreen();
    expect(screen.getByTestId('filter-all').props.accessibilityLabel).toBe(
      'All 1'
    );
    expect(screen.getByTestId('filter-stored').props.accessibilityLabel).toBe(
      'Stored 1'
    );
    expect(screen.queryByTestId('filter-failed')).not.toBeOnTheScreen();
  });

  it('filters the read by state while the chips keep the whole counts', async () => {
    await renderDetail({
      tracks: pageWithFailed,
      filteredTracks: {
        [TrackFileStatus.Failed]: {
          ...page,
          items: [failedTrack],
          total: 1,
          counts
        }
      }
    });

    await fireEvent.press(screen.getByTestId('filter-failed'));

    await waitFor(() => {
      expect(usePlaylistTracksMock).toHaveBeenLastCalledWith(
        'playlist-1',
        TrackFileStatus.Failed
      );
    });
    expect(
      within(screen.getByTestId('track-row')).getByText('Failed')
    ).toBeOnTheScreen();
    expect(screen.getByTestId('filter-all').props.accessibilityLabel).toBe(
      'All 1'
    );
    expect(
      screen.getByTestId('filter-failed').props.accessibilityState
    ).toMatchObject({ checked: true });
    expect(
      screen.getByTestId('filter-all').props.accessibilityState
    ).toMatchObject({ checked: false });
  });

  it('names an empty filter and returns the whole list from Show all', async () => {
    await renderDetail({
      tracks: pageWithFailed,
      filteredTracks: {
        [TrackFileStatus.Failed]: { ...emptyPage, counts }
      }
    });

    await fireEvent.press(screen.getByTestId('filter-failed'));

    await waitFor(() => {
      expect(screen.getByTestId('filter-empty')).toBeOnTheScreen();
    });
    expect(screen.getByText('No failed tracks')).toBeOnTheScreen();
    expect(screen.getByText('Show all')).toBeOnTheScreen();
    expect(screen.getByTestId('filter-failed')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('filter-show-all'));

    await waitFor(() => {
      expect(usePlaylistTracksMock).toHaveBeenLastCalledWith(
        'playlist-1',
        undefined
      );
    });
    expect(screen.queryByTestId('filter-empty')).not.toBeOnTheScreen();
  });

  it('filters the read to the retained tracks', async () => {
    await renderDetail({
      tracks: pageWithRetained,
      filteredTracks: {
        [REMOTE_REMOVED]: pageWithRetained
      }
    });

    await fireEvent.press(screen.getByTestId('filter-remoteRemoved'));

    await waitFor(() => {
      expect(usePlaylistTracksMock).toHaveBeenLastCalledWith(
        'playlist-1',
        REMOTE_REMOVED
      );
    });
    expect(
      screen.getByTestId('filter-remoteRemoved').props.accessibilityState
    ).toMatchObject({ checked: true });
    expect(
      screen.getByTestId('filter-remoteRemoved').props.accessibilityLabel
    ).toBe('Retained 1');
    expect(screen.getByTestId('filter-all').props.accessibilityLabel).toBe(
      'All 1'
    );
  });

  it('names an empty retained view with the provider', async () => {
    await renderDetail({
      tracks: pageWithRetained,
      filteredTracks: {
        [REMOTE_REMOVED]: { ...emptyPage, remoteRemoved: 1 }
      }
    });

    await fireEvent.press(screen.getByTestId('filter-remoteRemoved'));

    await waitFor(() => {
      expect(screen.getByTestId('filter-empty')).toBeOnTheScreen();
    });
    expect(
      screen.getByText('No track was retained after a YouTube removal')
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('filter-show-all'));

    await waitFor(() => {
      expect(usePlaylistTracksMock).toHaveBeenLastCalledWith(
        'playlist-1',
        undefined
      );
    });
  });

  it('hides the retained chip at zero while its view stays in force', async () => {
    await renderDetail({
      tracks: pageWithRetained,
      filteredTracks: {
        [REMOTE_REMOVED]: { ...emptyPage, remoteRemoved: 0 }
      }
    });

    await fireEvent.press(screen.getByTestId('filter-remoteRemoved'));

    await waitFor(() => {
      expect(screen.getByTestId('filter-empty')).toBeOnTheScreen();
    });
    expect(screen.queryByTestId('filter-remoteRemoved')).not.toBeOnTheScreen();
    expect(screen.getByText('Show all')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('filter-show-all'));

    await waitFor(() => {
      expect(usePlaylistTracksMock).toHaveBeenLastCalledWith(
        'playlist-1',
        undefined
      );
    });
  });

  it('writes the chosen sort from the sheet', async () => {
    const { sortMutate } = await renderDetail();

    await fireEvent.press(screen.getByTestId('detail-sort'));
    await waitFor(() => {
      expect(screen.getByTestId('playlist-sort-sheet')).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByTestId('playlist-sort-newest'));

    expect(sortMutate).toHaveBeenCalledWith(
      PlaylistSort.NewestFirst,
      expect.any(Object)
    );
    await waitFor(() => {
      expect(screen.queryByTestId('playlist-sort-sheet')).not.toBeOnTheScreen();
    });
  });

  it('explains a refused sort', async () => {
    const failure = new ApiError(503, {
      type: 'about:blank',
      title: 'Service unavailable',
      status: 503,
      code: ProblemCode.InternalError,
      detail: 'The sort is unavailable.'
    });
    const { sortMutate } = await renderDetail();
    const mutate = sortMutate as unknown as {
      mockImplementation: (
        fn: (
          sort: PlaylistSort,
          options: { onError?: (error: Error) => void }
        ) => void
      ) => void;
    };

    mutate.mockImplementation((_sort, options) => {
      options.onError?.(failure);
    });

    await fireEvent.press(screen.getByTestId('detail-sort'));
    await waitFor(() => {
      expect(screen.getByTestId('playlist-sort-sheet')).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByTestId('playlist-sort-newest'));

    await waitFor(() => {
      expect(screen.getByText('The sort was not changed.')).toBeOnTheScreen();
    });
    expect(screen.getByText('The sort is unavailable.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sort by: Playlist order')).toBeOnTheScreen();
    await waitFor(() => {
      expect(screen.queryByTestId('playlist-sort-sheet')).not.toBeOnTheScreen();
    });
  });

  it('disables the sort for a read collaborator but not the chips', async () => {
    await renderDetail({
      playlist: { ...playlist, access: ShareLevel.Read }
    });

    expect(screen.getByTestId('detail-sort')).toBeDisabled();
    expect(screen.getByTestId('filter-all')).not.toBeDisabled();
  });

  it('disables the sort and the chips while the list is shuffled', async () => {
    usePlayerStore.setState({
      queue: ['track-1'],
      playlistId: 'playlist-1',
      currentId: 'track-1',
      shuffle: true
    });
    await renderDetail({ tracks: pageWithFailed });

    expect(screen.getByTestId('detail-sort')).toBeDisabled();
    expect(screen.getByTestId('filter-all')).toBeDisabled();
    expect(screen.getByTestId('filter-failed')).toBeDisabled();
  });

  it('keeps the filter out of what Play starts', async () => {
    await renderDetail({
      tracks: pageWithFailed,
      queue: [track, secondTrack],
      filteredTracks: {
        [TrackFileStatus.Failed]: { ...emptyPage, counts }
      }
    });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('filter-failed'));
    });
    await act(async () => {
      await fireEvent.press(screen.getByTestId('detail-play'));
    });

    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBe('track-1');
    });
    expect(usePlayerStore.getState().queue).toEqual(['track-1', 'track-2']);
  });

  it('marks the current row and starts the queue at a press', async () => {
    usePlayerStore.setState({
      queue: [],
      playlistId: 'playlist-1',
      currentId: 'track-1',
      isPlaying: true
    });
    await renderDetail();

    expect(screen.getByText('Playing', hidden)).toBeOnTheScreen();
    expect(
      screen.getByTestId('track-bars', { includeHiddenElements: true })
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('track-play'));

    expect(usePlayerStore.getState()).toMatchObject({
      queue: ['track-1'],
      playlistId: 'playlist-1',
      currentId: 'track-1'
    });
  });

  it('appends the next page near the bottom and stops at the end', async () => {
    const { tracksFetchNextPage } = await renderDetail({ hasMore: true });
    const scroll = screen.getByTestId('playlist-scroll');

    await fireEvent.scroll(scroll, {
      nativeEvent: {
        contentOffset: { y: 0 },
        contentSize: { height: 2000 },
        layoutMeasurement: { height: 400 }
      }
    });
    expect(tracksFetchNextPage).not.toHaveBeenCalled();

    await fireEvent.scroll(scroll, {
      nativeEvent: {
        contentOffset: { y: 1600 },
        contentSize: { height: 2000 },
        layoutMeasurement: { height: 400 }
      }
    });
    expect(tracksFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('reports the next page in flight', async () => {
    await renderDetail({ hasMore: true, fetchingNextPage: true });

    expect(screen.getByTestId('tracks-append')).toBeOnTheScreen();
    expect(screen.getByText('Loading...')).toBeOnTheScreen();
  });

  it('offers a retry when the next page fails', async () => {
    const { tracksFetchNextPage } = await renderDetail({
      hasMore: true,
      fetchNextPageError: true
    });

    expect(screen.getByText('Try again')).toBeOnTheScreen();
    expect(screen.getByTestId('tracks-append-retry')).toHaveStyle({
      minHeight: 48
    });

    await fireEvent.press(screen.getByTestId('tracks-append-retry'));
    expect(tracksFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('lands on the current row once when this playlist is the queue', async () => {
    usePlayerStore.setState({
      queue: ['track-1', 'track-2', 'track-3'],
      playlistId: 'playlist-1',
      currentId: 'track-2'
    });
    const scrollToIndex = jest
      .spyOn(FlatList.prototype, 'scrollToIndex')
      .mockImplementation(() => {});
    await renderDetail({
      tracks: { ...page, items: [track, secondTrack, thirdTrack], total: 3 },
      queue: [track, secondTrack, thirdTrack]
    });

    expect(screen.queryByTestId('playlist-skeleton')).not.toBeOnTheScreen();

    await reportViewable([]);

    expect(scrollToIndex).toHaveBeenCalledWith({
      index: 1,
      animated: false,
      viewOffset: tokenLength('space-4')
    });

    await reportViewable([]);
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
  });

  it('keeps the list where it is when the current row is already on screen', async () => {
    usePlayerStore.setState({
      queue: ['track-1', 'track-2', 'track-3'],
      playlistId: 'playlist-1',
      currentId: 'track-2'
    });
    const scrollToIndex = jest
      .spyOn(FlatList.prototype, 'scrollToIndex')
      .mockImplementation(() => {});
    await renderDetail({
      tracks: { ...page, items: [track, secondTrack, thirdTrack], total: 3 },
      queue: [track, secondTrack, thirdTrack]
    });

    await reportViewable(['track-2']);

    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it('asks for the page holding the current row when it is not loaded', async () => {
    usePlayerStore.setState({
      queue: ['track-1', 'track-2'],
      playlistId: 'playlist-1',
      currentId: 'track-2'
    });
    const { tracksFetchNextPage } = await renderDetail({
      hasMore: true,
      queue: [track, secondTrack]
    });

    expect(screen.getByTestId('playlist-skeleton')).toBeOnTheScreen();
    expect(screen.getByTestId('playlist-identity')).toBeOnTheScreen();
    expect(screen.queryByTestId('track-row')).not.toBeOnTheScreen();

    await waitFor(() => {
      expect(tracksFetchNextPage).toHaveBeenCalled();
    });
  });

  it('does not retry a failed page from the landing', async () => {
    usePlayerStore.setState({
      queue: ['track-1', 'track-2'],
      playlistId: 'playlist-1',
      currentId: 'track-2'
    });
    const { tracksFetchNextPage } = await renderDetail({
      hasMore: true,
      fetchNextPageError: true
    });

    expect(tracksFetchNextPage).not.toHaveBeenCalled();
  });

  it('does not land when another playlist is the queue', async () => {
    usePlayerStore.setState({
      queue: ['track-1'],
      playlistId: 'playlist-2',
      currentId: 'track-1'
    });
    const scrollToIndex = jest
      .spyOn(FlatList.prototype, 'scrollToIndex')
      .mockImplementation(() => {});
    await renderDetail();

    await reportViewable([]);

    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  async function openFailedSheet(options: RenderOptions = {}) {
    const result = await renderDetail({
      tracks: { ...page, items: [failedTrack], total: 1 },
      queue: [],
      ...options
    });

    await fireEvent.press(screen.getByTestId('track-actions'));

    await waitFor(() => {
      expect(screen.getByTestId('track-actions-sheet')).toBeOnTheScreen();
    });

    return result;
  }

  async function openStoredSheet(options: RenderOptions = {}) {
    const result = await renderDetail(options);

    await fireEvent.press(screen.getByTestId('track-actions'));

    await waitFor(() => {
      expect(screen.getByTestId('track-actions-sheet')).toBeOnTheScreen();
    });

    return result;
  }

  async function openHeaderSheet(options: RenderOptions = {}) {
    const result = await renderDetail(options);

    await fireEvent.press(screen.getByTestId('detail-actions'));

    await waitFor(() => {
      expect(screen.getByTestId('playlist-actions-sheet')).toBeOnTheScreen();
    });

    return result;
  }

  async function openRenameSheet(options: RenderOptions = {}) {
    const result = await openHeaderSheet(options);

    await fireEvent.press(screen.getByTestId('playlist-action-rename'));

    await waitFor(() => {
      expect(screen.getByTestId('rename-sheet')).toBeOnTheScreen();
    });

    return result;
  }

  /* React 19 defers the state an event writes, so the test waits for the field
   * to hold what was typed before pressing Save. */
  async function typeRename(value: string) {
    await fireEvent.changeText(screen.getByLabelText('Playlist name'), value);

    await waitFor(
      () => {
        expect(screen.getByLabelText('Playlist name')).toHaveDisplayValue(
          value
        );
      },
      { timeout: 3000 }
    );
  }

  it('copies the track absolute link and confirms', async () => {
    copyTextMock.mockResolvedValue(true);
    await openFailedSheet();

    await fireEvent.press(screen.getByTestId('track-action-copy'));

    await waitFor(() => {
      expect(copyTextMock).toHaveBeenCalledWith(
        'https://instance.test/playlists/playlist-1?track=track-1'
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Link copied')).toBeOnTheScreen();
    });
  });

  it('explains a refused copy', async () => {
    copyTextMock.mockResolvedValue(false);
    await openFailedSheet();

    await fireEvent.press(screen.getByTestId('track-action-copy'));

    await waitFor(() => {
      expect(
        screen.getByText('The link could not be copied.')
      ).toBeOnTheScreen();
    });
  });

  it('retries the failed track', async () => {
    const { retryMutate } = await openFailedSheet();

    await fireEvent.press(screen.getByTestId('track-action-retry'));

    expect(retryMutate).toHaveBeenCalledWith('track-1', expect.any(Object));
  });

  it('fetches the failed track whole', async () => {
    const { fetchWholeMutate } = await openFailedSheet();

    await fireEvent.press(screen.getByTestId('track-action-fetchWhole'));

    expect(fetchWholeMutate).toHaveBeenCalledWith(
      'track-1',
      expect.any(Object)
    );
  });

  it('explains a refused retry', async () => {
    const failure = new ApiError(503, {
      type: 'about:blank',
      title: 'Service unavailable',
      status: 503,
      code: ProblemCode.InternalError,
      detail: 'The track could not be retried.'
    });
    const { retryMutate } = await openFailedSheet();
    const mutate = retryMutate as unknown as {
      mockImplementation: (
        fn: (
          trackId: string,
          options: { onError?: (error: Error) => void }
        ) => void
      ) => void;
    };

    mutate.mockImplementation((_trackId, options) => {
      options.onError?.(failure);
    });

    await fireEvent.press(screen.getByTestId('track-action-retry'));

    await waitFor(() => {
      expect(
        screen.getByText('The track could not be retried.')
      ).toBeOnTheScreen();
    });
  });

  it('removes the row at once and Undo restores it without a request', async () => {
    const { removeMutate } = await openStoredSheet();

    await fireEvent.press(screen.getByTestId('track-action-remove'));

    await waitFor(() => {
      expect(screen.queryByTestId('track-row')).not.toBeOnTheScreen();
    });
    expect(screen.getByTestId('undo-snackbar')).toBeOnTheScreen();
    expect(screen.getByTestId('undo-snackbar')).toHaveStyle({
      left: tokenLength('space-4'),
      right: tokenLength('space-4')
    });
    expect(screen.getByText('Removing track')).toBeOnTheScreen();
    expect(removeMutate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('undo-snackbar-action'));

    await waitFor(() => {
      expect(screen.getByTestId('track-row')).toBeOnTheScreen();
    });
    expect(removeMutate).not.toHaveBeenCalled();
  });

  it('starts the undo window only after the row sheet has left', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);

    await openStoredSheet();

    await fireEvent.press(screen.getByTestId('track-action-remove'));

    expect(screen.getByTestId('track-actions-sheet')).toBeOnTheScreen();
    expect(screen.queryByTestId('undo-snackbar')).not.toBeOnTheScreen();

    await waitFor(() => {
      expect(screen.queryByTestId('track-actions-sheet')).not.toBeOnTheScreen();
    });
    expect(screen.getByTestId('undo-snackbar')).toBeOnTheScreen();
  });

  it('undoes a press that began inside the window after it expired', async () => {
    const { removeMutate } = await openStoredSheet({ undoWindowMs: 1000 });

    await fireEvent.press(screen.getByTestId('track-action-remove'));

    await waitFor(() => {
      expect(screen.getByTestId('undo-snackbar')).toBeOnTheScreen();
    });

    const openedAt = performance.now();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('undo-snackbar')).toBeOnTheScreen();

    await act(async () => {
      await fireEvent(screen.getByTestId('undo-snackbar'), 'touchStart', {
        nativeEvent: { timestamp: openedAt }
      });
    });
    await act(async () => {
      await fireEvent.press(screen.getByTestId('undo-snackbar-action'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('track-row')).toBeOnTheScreen();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(removeMutate).not.toHaveBeenCalled();
  });

  it('leaves the removal committed when the press began after the window', async () => {
    const { removeMutate } = await openStoredSheet({ undoWindowMs: 1000 });

    await fireEvent.press(screen.getByTestId('track-action-remove'));

    await waitFor(() => {
      expect(screen.getByTestId('undo-snackbar')).toBeOnTheScreen();
    });

    const openedAt = performance.now();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await act(async () => {
      await fireEvent(screen.getByTestId('undo-snackbar'), 'touchStart', {
        nativeEvent: { timestamp: openedAt + 1001 }
      });
    });
    await act(async () => {
      await fireEvent.press(screen.getByTestId('undo-snackbar-action'));
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(removeMutate).toHaveBeenCalledWith('track-1', expect.any(Object));
    expect(screen.queryByTestId('undo-snackbar')).not.toBeOnTheScreen();
  });

  it('commits the removal after the window', async () => {
    const { removeMutate } = await openStoredSheet({ undoWindowMs: 20 });

    await fireEvent.press(screen.getByTestId('track-action-remove'));

    await waitFor(() => {
      expect(removeMutate).toHaveBeenCalledWith('track-1', expect.any(Object));
    });
  });

  it('restores the row and explains a failed removal', async () => {
    const failure = new ApiError(503, {
      type: 'about:blank',
      title: 'Service unavailable',
      status: 503,
      code: ProblemCode.InternalError,
      detail: 'The track could not be removed.'
    });
    const { removeMutate } = await openStoredSheet({ undoWindowMs: 20 });
    const mutate = removeMutate as unknown as {
      mockImplementation: (
        fn: (
          trackId: string,
          options: { onError?: (error: Error) => void }
        ) => void
      ) => void;
    };

    mutate.mockImplementation((_trackId, options) => {
      options.onError?.(failure);
    });

    await fireEvent.press(screen.getByTestId('track-action-remove'));

    await waitFor(() => {
      expect(
        screen.getByText('The track could not be removed.')
      ).toBeOnTheScreen();
    });
    expect(screen.getByTestId('track-row')).toBeOnTheScreen();
  });

  it('dims the detail for a delete and Undo restores it', async () => {
    const { deleteMutate } = await openHeaderSheet();

    await fireEvent.press(screen.getByTestId('playlist-action-delete'));

    await waitFor(() => {
      expect(screen.getByTestId('undo-snackbar')).toBeOnTheScreen();
    });
    expect(screen.getByText('Deleting playlist')).toBeOnTheScreen();
    expect(screen.getByTestId('playlist-scroll').props.pointerEvents).toBe(
      'none'
    );
    expect(screen.getByTestId('playlist-scroll')).toHaveStyle({
      opacity: tokenNumber('opacity-disabled')
    });
    expect(deleteMutate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('undo-snackbar-action'));

    await waitFor(() => {
      expect(screen.queryByTestId('undo-snackbar')).not.toBeOnTheScreen();
    });
    expect(deleteMutate).not.toHaveBeenCalled();
  });

  it('leaves the back gesture to the system when no delete is pending', async () => {
    const addEventListener = jest.spyOn(BackHandler, 'addEventListener');

    await renderDetail();

    expect(addEventListener).not.toHaveBeenCalled();
  });

  it('keeps the back gesture out while a delete is pending', async () => {
    const addEventListener = jest.spyOn(BackHandler, 'addEventListener');
    const { onBack } = await openHeaderSheet({ undoWindowMs: 2000 });

    await fireEvent.press(screen.getByTestId('playlist-action-delete'));

    await waitFor(() => {
      expect(addEventListener).toHaveBeenCalled();
    });

    const listener = addEventListener.mock.calls.at(-1)?.[1];

    expect(listener?.({} as never)).toBe(true);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('commits the delete after the window and pops to the gallery', async () => {
    const { onBack, deleteMutate } = await openHeaderSheet({
      undoWindowMs: 20
    });
    const mutate = deleteMutate as unknown as {
      mockImplementation: (
        fn: (playlistId: string, options: { onSuccess?: () => void }) => void
      ) => void;
    };

    mutate.mockImplementation((_playlistId, options) => {
      options.onSuccess?.();
    });

    await fireEvent.press(screen.getByTestId('playlist-action-delete'));

    await waitFor(() => {
      expect(deleteMutate).toHaveBeenCalledWith(
        'playlist-1',
        expect.any(Object)
      );
    });
    await waitFor(() => {
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  it('explains a failed delete and keeps the detail', async () => {
    const failure = new ApiError(503, {
      type: 'about:blank',
      title: 'Service unavailable',
      status: 503,
      code: ProblemCode.InternalError,
      detail: 'The playlist could not be deleted.'
    });
    const { onBack, deleteMutate } = await openHeaderSheet({
      undoWindowMs: 20
    });
    const mutate = deleteMutate as unknown as {
      mockImplementation: (
        fn: (
          playlistId: string,
          options: { onError?: (error: Error) => void }
        ) => void
      ) => void;
    };

    mutate.mockImplementation((_playlistId, options) => {
      options.onError?.(failure);
    });

    await fireEvent.press(screen.getByTestId('playlist-action-delete'));

    await waitFor(() => {
      expect(
        screen.getByText('The playlist could not be deleted.')
      ).toBeOnTheScreen();
    });
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.getByTestId('playlist-scroll').props.pointerEvents).toBe(
      'auto'
    );
  });

  it('prefills and renames from the detail header', async () => {
    const { renameMutate } = await openRenameSheet();

    expect(screen.getByLabelText('Playlist name')).toHaveDisplayValue(
      'Rain On The Window'
    );

    const mutate = renameMutate as unknown as {
      mockImplementation: (
        fn: (
          variables: { playlistId: string; name: string },
          options: { onSuccess?: () => void }
        ) => void
      ) => void;
    };

    mutate.mockImplementation((_variables, options) => {
      options.onSuccess?.();
    });

    await typeRename('  New Name  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(renameMutate).toHaveBeenCalledWith(
      { playlistId: 'playlist-1', name: 'New Name' },
      expect.any(Object)
    );
    await waitFor(() => {
      expect(screen.queryByTestId('rename-sheet')).not.toBeOnTheScreen();
    });
  });

  it('keeps a refused rename open with the problem sentence', async () => {
    const failure = new ApiError(503, {
      type: 'about:blank',
      title: 'Service unavailable',
      status: 503,
      code: ProblemCode.InternalError,
      detail: 'The playlist could not be renamed.'
    });
    const { renameMutate } = await openRenameSheet();
    const mutate = renameMutate as unknown as {
      mockImplementation: (
        fn: (
          variables: { playlistId: string; name: string },
          options: { onError?: (error: Error) => void }
        ) => void
      ) => void;
    };

    mutate.mockImplementation((_variables, options) => {
      options.onError?.(failure);
    });

    await typeRename('New Name');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The playlist could not be renamed.'
      );
    });
    expect(screen.getByTestId('rename-sheet')).toBeOnTheScreen();
  });

  it('opens the share sheet from the detail', async () => {
    await openHeaderSheet();

    await fireEvent.press(screen.getByTestId('playlist-action-share'));

    await waitFor(() => {
      expect(screen.getByTestId('share-sheet')).toBeOnTheScreen();
    });
    expect(
      screen.getByRole('header', { name: 'Share playlist' })
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('share-done'));
    await waitFor(() => {
      expect(screen.queryByTestId('share-sheet')).not.toBeOnTheScreen();
    });
  });

  it('opens the cover sheet from the detail', async () => {
    await openHeaderSheet();

    await fireEvent.press(screen.getByTestId('playlist-action-cover'));

    await waitFor(() => {
      expect(
        screen.getByRole('header', { name: 'Playlist cover' })
      ).toBeOnTheScreen();
    });
    expect(
      screen.getByTestId('cover-save').props.accessibilityState
    ).toMatchObject({ disabled: true });

    await fireEvent.press(screen.getByTestId('cover-backdrop'));
    await waitFor(() => {
      expect(
        screen.queryByRole('header', { name: 'Playlist cover' })
      ).not.toBeOnTheScreen();
    });
  });

  it('draws the cover with the session headers', async () => {
    await renderDetail();

    const image = screen.getByTestId('playlist-cover-image');

    expect(image.props.source.uri).toBe(
      'https://instance.test/api/v1/playlists/playlist-1/cover?v=2026-10-01T00%3A00%3A00.000Z'
    );
    expect(image.props.source.headers).toEqual({
      'P-Access-Token-Id': 'token-id',
      'P-Access-Token': 'token-secret',
      'User-Agent': 'PlayLiberty/1.0 (Android)'
    });
  });

  it('announces the share mark', async () => {
    await renderDetail();

    expect(screen.getByLabelText('Private playlist')).toBeOnTheScreen();
  });

  it('names the owner of a shared playlist', async () => {
    await renderDetail({
      playlist: {
        ...playlist,
        ownerAccountId: 'account-2',
        access: ShareLevel.Read
      },
      directory: [bea]
    });

    expect(screen.getByLabelText('You are a collaborator')).toBeOnTheScreen();
    expect(screen.getByText('Shared by Bea')).toBeOnTheScreen();
  });

  it('draws no owner line for an owned playlist', async () => {
    await renderDetail({ directory: [bea] });

    expect(screen.queryByText('Shared by Bea')).not.toBeOnTheScreen();
  });

  it('keeps the frame and the skeleton for a pending read', async () => {
    await renderDetail({ pending: true });

    expect(screen.getByTestId('playlist-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('playlist-skeleton')).toBeOnTheScreen();
    expect(screen.getByTestId('playlist-identity-skeleton')).toBeOnTheScreen();
    expect(screen.getByLabelText('Loading tracks.')).toBeOnTheScreen();
    expect(screen.queryByTestId('playlist-identity')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('track-row')).not.toBeOnTheScreen();
  });

  it('leaves through the header back control', async () => {
    const { onBack } = await renderDetail();

    await fireEvent.press(screen.getByTestId('detail-back'));

    await waitFor(() => {
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  it('finishes a committed pull before it leaves for the gallery', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    const pullRelease = capturePull();
    const { onBack } = await renderDetail();
    await act(async () => {});
    let finish: ((result: { finished: boolean }) => void) | null = null;
    const timing = jest.spyOn(Animated, 'timing').mockImplementation(
      () =>
        ({
          start: (callback?: (result: { finished: boolean }) => void) => {
            finish = callback ?? null;
          },
          stop: jest.fn(),
          reset: jest.fn()
        }) as never
    );

    await act(() => {
      pullRelease()?.({}, { dy: 300, vy: 0 });
    });

    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: Dimensions.get('window').height,
        duration: tokenDuration('motion-slow'),
        useNativeDriver: true
      })
    );
    expect(onBack).not.toHaveBeenCalled();

    await act(() => {
      finish?.({ finished: true });
    });

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('leaves at once on a committed pull without motion', async () => {
    const pullRelease = capturePull();
    const { onBack } = await renderDetail();
    await act(async () => {});
    const timing = jest.spyOn(Animated, 'timing');

    await act(() => {
      pullRelease()?.({}, { dy: 300, vy: 0 });
    });

    expect(timing).not.toHaveBeenCalled();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('draws the identity over the skeleton while the tracks page is pending', async () => {
    await renderDetail({ tracksPending: true });

    expect(screen.getByTestId('playlist-identity')).toBeOnTheScreen();
    expect(screen.getByTestId('playlist-skeleton')).toBeOnTheScreen();
    expect(screen.queryByTestId('track-row')).not.toBeOnTheScreen();
  });

  it('draws the playlist not-found body with a way back and no retry', async () => {
    const { onBack } = await renderDetail({ playlistError: notFound });

    expect(screen.getByTestId('playlist-not-found')).toBeOnTheScreen();
    expect(screen.getByText('This playlist is not here')).toBeOnTheScreen();
    expect(screen.queryByTestId('read-failure-retry')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Back to home' }));

    await waitFor(() => {
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  it('draws the playlist read failure with its own retry', async () => {
    const { playlistRefetch } = await renderDetail({
      playlistError: playlistFailure
    });

    expect(screen.getByText('The playlist is unavailable.')).toBeOnTheScreen();
    expect(screen.queryByTestId('playlist-identity')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('read-failure-retry'));
    expect(playlistRefetch).toHaveBeenCalledTimes(1);
  });

  it('draws the tracks read failure with its own retry', async () => {
    const { tracksRefetch } = await renderDetail({
      tracksError: tracksFailure
    });

    expect(screen.getByTestId('playlist-identity')).toBeOnTheScreen();
    expect(screen.getByText('The tracks are unavailable.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('read-failure-retry'));
    expect(tracksRefetch).toHaveBeenCalledTimes(1);
  });

  it('offers Sync now on a never-synced empty playlist', async () => {
    const { syncMutate } = await renderDetail({
      playlist: neverSynced,
      tracks: emptyPage
    });

    expect(screen.getByTestId('playlist-empty')).toBeOnTheScreen();
    expect(screen.getByText('Nothing here yet')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('empty-sync'));
    expect(syncMutate).toHaveBeenCalledWith('playlist-1');
  });

  it('draws no Sync now for a read collaborator', async () => {
    await renderDetail({
      playlist: { ...neverSynced, access: ShareLevel.Read },
      tracks: emptyPage
    });

    expect(screen.getByText('Nothing here yet')).toBeOnTheScreen();
    expect(screen.queryByTestId('empty-sync')).not.toBeOnTheScreen();
  });

  it('says there are no tracks on a synced empty playlist', async () => {
    await renderDetail({ playlist: syncedEmpty, tracks: emptyPage });

    expect(screen.getByTestId('playlist-no-tracks')).toBeOnTheScreen();
    expect(screen.getByText('No tracks yet.')).toBeOnTheScreen();
    expect(screen.queryByText('Nothing here yet')).not.toBeOnTheScreen();
  });

  it('reports the Sync now control in flight', async () => {
    await renderDetail({
      playlist: neverSynced,
      tracks: emptyPage,
      syncPending: true
    });

    expect(screen.getByTestId('empty-sync')).toBeDisabled();
    expect(
      within(screen.getByTestId('empty-sync')).getByText('Syncing')
    ).toBeOnTheScreen();
  });

  it('starts at the first playable track from the whole queue', async () => {
    await renderDetail({
      tracks: { ...page, items: [failedTrack], total: 1 },
      queue: [failedTrack, secondTrack, thirdTrack]
    });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('detail-play'));
    });

    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBe('track-2');
    });

    const state = usePlayerStore.getState();

    expect(state.queue).toEqual(['track-2', 'track-3']);
    expect(state.playlistId).toBe('playlist-1');
    expect(state.shuffle).toBe(false);
  });

  it('mirrors the player bar play state and toggles it', async () => {
    await renderDetail();

    expect(screen.getByLabelText('Play this playlist')).toBeOnTheScreen();

    await act(async () => {
      await fireEvent.press(screen.getByTestId('detail-play'));
    });

    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBe('track-1');
      expect(screen.getByLabelText('Pause this playlist')).toBeOnTheScreen();
      expect(screen.getByTestId('detail-play')).not.toBeDisabled();
    });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('detail-play'));
    });

    await waitFor(() => {
      expect(usePlayerStore.getState().isPlaying).toBe(false);
      expect(screen.getByLabelText('Play this playlist')).toBeOnTheScreen();
    });
  });

  it('shuffles every playable track from a random one', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    await renderDetail({
      queue: [track, secondTrack, thirdTrack]
    });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('detail-shuffle'));
    });

    await waitFor(() => {
      expect(usePlayerStore.getState().shuffle).toBe(true);
    });

    const state = usePlayerStore.getState();

    expect(state.queue[0]).toBe('track-1');
    expect([...state.queue].sort()).toEqual(['track-1', 'track-2', 'track-3']);
    expect(state.currentId).toBe('track-1');
  });

  it('draws the shuffled queue order and restores the saved order when off', async () => {
    usePlayerStore.setState({
      queue: ['track-3', 'track-2', 'track-1'],
      sourceQueue: ['track-1', 'track-2', 'track-3'],
      playlistId: 'playlist-1',
      currentId: 'track-2',
      shuffle: true
    });
    await renderDetail({
      tracks: { ...page, items: [track, secondTrack, thirdTrack], total: 3 },
      queue: [track, secondTrack, thirdTrack]
    });

    const titles = (): readonly string[] =>
      screen
        .getAllByTestId('track-title', hidden)
        .map(node => node.props.children);

    expect(titles()).toEqual(['Third Song', 'Second Song', 'First Song']);
    expect(
      screen.getByTestId('detail-shuffle').props.accessibilityState
    ).toMatchObject({ selected: true, disabled: false });

    await fireEvent.press(screen.getByTestId('detail-shuffle'));

    expect(usePlayerStore.getState().shuffle).toBe(false);
    expect(usePlayerStore.getState().queue).toEqual([
      'track-1',
      'track-2',
      'track-3'
    ]);
    expect(usePlayerStore.getState().currentId).toBe('track-2');

    await waitFor(() => {
      expect(titles()).toEqual(['First Song', 'Second Song', 'Third Song']);
    });
  });

  it('re-applies the queue read over the live queue', async () => {
    usePlayerStore.setState({
      queue: ['track-1'],
      sourceQueue: ['track-1'],
      playlistId: 'playlist-1',
      currentId: 'track-1',
      positionSeconds: 10
    });
    await renderDetail({
      tracks: { ...page, items: [track, secondTrack], total: 2 },
      queue: [track, secondTrack]
    });

    await waitFor(() => {
      expect(usePlayerStore.getState().queue).toEqual(['track-1', 'track-2']);
    });
    expect(usePlayerStore.getState().currentId).toBe('track-1');
    expect(usePlayerStore.getState().positionSeconds).toBe(10);
  });

  it('disables both start controls on an empty queue', async () => {
    await renderDetail({ queue: [] });

    expect(screen.getByTestId('detail-play')).toBeDisabled();
    expect(screen.getByTestId('detail-shuffle')).toBeDisabled();
    expect(screen.getByLabelText('Play this playlist')).toBeDisabled();
    expect(screen.getByLabelText('Shuffle Rain On The Window')).toBeDisabled();
  });

  it('starts a playlist for a read collaborator', async () => {
    await renderDetail({
      playlist: { ...playlist, access: ShareLevel.Read }
    });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('detail-play'));
    });

    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBe('track-1');
    });
    expect(usePlayerStore.getState().queue).toEqual(['track-1']);
  });

  it('reports the start waiting on its queue read', async () => {
    await renderDetail({ queuePending: true });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('detail-play'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('detail-play')).toBeDisabled();
    });
    expect(screen.getByTestId('detail-shuffle')).toBeDisabled();
    expect(screen.getByTestId('detail-play').props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
      selected: false
    });
  });

  it('reports the shuffle waiting on its queue read', async () => {
    await renderDetail({ queuePending: true });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('detail-shuffle'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('detail-shuffle')).toBeDisabled();
    });
    expect(screen.getByTestId('detail-play')).toBeDisabled();
    expect(
      screen.getByTestId('detail-shuffle').props.accessibilityState
    ).toEqual({ disabled: true, selected: false, busy: true });
  });

  it('explains a failed queue read', async () => {
    const queueFailure = new ApiError(503, {
      type: 'about:blank',
      title: 'Service unavailable',
      status: 503,
      code: ProblemCode.InternalError,
      detail: 'The queue is unavailable.'
    });
    await renderDetail({ queueError: queueFailure });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('detail-play'));
    });

    await waitFor(() => {
      expect(screen.getByText(/could not be read/)).toBeOnTheScreen();
    });
  });

  it('shows a running latest sync as the playlist state', async () => {
    const running: SyncRun = {
      id: 'run-1',
      playlistId: 'playlist-1',
      status: SyncRunStatus.Running,
      addedCount: 0,
      retainedCount: 0,
      removedCount: 0,
      failedCount: 0,
      startedAt: '2026-10-01T11:59:00.000Z',
      finishedAt: null,
      error: null
    };

    await renderDetail({ latestRun: running });

    expect(screen.getByText('Syncing')).toBeOnTheScreen();
  });

  it('draws the run band at the top of the actions sheet', async () => {
    await renderDetail({ latestRun: completedRun });

    expect(screen.queryByTestId('sync-band')).not.toBeOnTheScreen();
    expect(screen.queryByText('Last sync 2 days ago')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('detail-actions'));

    await waitFor(() => {
      expect(screen.getByTestId('playlist-actions-sheet')).toBeOnTheScreen();
    });

    const sheet = screen.getByTestId('playlist-actions-sheet');
    const summary = within(sheet).getByTestId('playlist-actions-summary');

    expect(within(summary).getByTestId('sync-band')).toBeOnTheScreen();
    expect(screen.getByText('Last sync 2 days ago')).toBeOnTheScreen();
    expect(screen.getByLabelText('3 kept')).toBeOnTheScreen();
  });

  it('retries a failed sync for a writer', async () => {
    const failedRun: SyncRun = {
      ...completedRun,
      status: SyncRunStatus.Failed,
      error: 'yt-dlp: HTTP 403'
    };
    const { syncMutate } = await openHeaderSheet({
      playlist: { ...playlist, syncStatus: PlaylistSyncStatus.Error },
      latestRun: failedRun
    });

    expect(screen.queryByTestId('sync-cell-kept')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('sync-error-retry'));
    expect(syncMutate).toHaveBeenCalledWith('playlist-1');
  });

  it('retries the failed set from the band', async () => {
    const { retryFailedMutate } = await openHeaderSheet({
      latestRun: completedRun,
      tracks: {
        ...page,
        counts: { ...counts, [TrackFileStatus.Failed]: 2 }
      }
    });

    await fireEvent.press(screen.getByTestId('sync-retry-failed'));
    expect(retryFailedMutate).toHaveBeenCalledTimes(1);
  });

  it('cancels the running sync from the run band', async () => {
    const { cancelMutate } = await openHeaderSheet({ latestRun: runningRun });
    const sheet = screen.getByTestId('playlist-actions-sheet');

    expect(within(sheet).getByText('Syncing')).toBeOnTheScreen();

    await fireEvent.press(
      within(sheet).getByLabelText('Cancel sync, Rain On The Window')
    );

    expect(cancelMutate).toHaveBeenCalledWith('playlist-1', expect.any(Object));
  });

  it('holds the header control and the dial while a run is running', async () => {
    await renderDetail({ latestRun: runningRun });

    expect(screen.getByTestId('detail-sync-control')).toBeDisabled();
    expect(screen.getByTestId('detail-fab')).toBeDisabled();
  });

  it('notices a failed cancel and re-enables the action', async () => {
    const failure = new ApiError(500, {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      code: ProblemCode.InternalError,
      detail: 'The cancel did not reach the server.'
    });
    await openHeaderSheet({ latestRun: runningRun, cancelError: failure });
    const sheet = screen.getByTestId('playlist-actions-sheet');

    await fireEvent.press(within(sheet).getByTestId('sync-cancel'));

    expect(
      await screen.findByText('Could not cancel the sync')
    ).toBeOnTheScreen();
    expect(
      screen.getByText('The cancel did not reach the server.')
    ).toBeOnTheScreen();
    expect(within(sheet).getByTestId('sync-cancel')).not.toBeDisabled();
    expect(within(sheet).getByText('Syncing')).toBeOnTheScreen();
  });

  it('offers no Cancel to a reader', async () => {
    await openHeaderSheet({
      playlist: { ...playlist, access: ShareLevel.Read },
      latestRun: runningRun
    });
    expect(screen.queryByTestId('sync-cancel')).not.toBeOnTheScreen();
  });

  it('draws no sync retry for a read collaborator', async () => {
    await openHeaderSheet({
      playlist: {
        ...playlist,
        access: ShareLevel.Read,
        syncStatus: PlaylistSyncStatus.Error
      },
      latestRun: { ...completedRun, status: SyncRunStatus.Failed, error: '403' }
    });

    expect(screen.queryByTestId('sync-error-retry')).not.toBeOnTheScreen();
    expect(screen.getByText(/Could not reach YouTube/)).toBeOnTheScreen();
  });

  it('reads the route id', async () => {
    await renderDetail();

    expect(usePlaylistMock).toHaveBeenCalledWith('playlist-1');
    expect(usePlaylistTracksMock).toHaveBeenCalledWith('playlist-1', undefined);
    expect(usePlaylistQueueMock).toHaveBeenCalledWith('playlist-1', true);
    expect(useLatestSyncRunMock).toHaveBeenCalledWith('playlist-1');
  });

  it('draws the add action for a writer', async () => {
    await renderDetail();

    await fireEvent.press(screen.getByTestId('detail-fab'));

    expect(screen.getByTestId('detail-add-track')).toBeOnTheScreen();
    expect(screen.getByLabelText('Add a track')).toBeOnTheScreen();
  });

  it('syncs the playlist from the dial', async () => {
    const { syncMutate } = await renderDetail();

    await fireEvent.press(screen.getByTestId('detail-fab'));
    await fireEvent.press(screen.getByTestId('detail-sync'));

    expect(syncMutate).toHaveBeenCalledWith('playlist-1', expect.any(Object));
  });

  it('syncs from the state line for a writer', async () => {
    const { syncMutate } = await renderDetail();

    await fireEvent.press(screen.getByTestId('detail-sync-control'));

    expect(syncMutate).toHaveBeenCalledWith('playlist-1', expect.any(Object));
    expect(
      screen.getByRole('button', { name: 'Sync, Rain On The Window' })
    ).toBeOnTheScreen();
  });

  it('draws no state-line sync for a reader', async () => {
    await renderDetail({
      playlist: { ...playlist, access: ShareLevel.Read }
    });

    expect(screen.queryByTestId('detail-sync-control')).not.toBeOnTheScreen();
  });

  it('draws the state-line sync for a write collaborator', async () => {
    await renderDetail({
      playlist: { ...playlist, access: ShareLevel.Write }
    });

    expect(screen.getByTestId('detail-sync-control')).toBeOnTheScreen();
  });

  it('holds the state-line sync while a run is live', async () => {
    await renderDetail({ syncPending: true });

    expect(screen.getByTestId('detail-sync-control')).toBeDisabled();
  });

  it('holds the dial while the playlist syncs', async () => {
    await renderDetail({ syncPending: true });

    expect(screen.getByTestId('detail-fab')).toBeDisabled();
  });

  it('draws no add action for a read collaborator', async () => {
    await renderDetail({
      playlist: { ...playlist, access: ShareLevel.Read }
    });

    expect(screen.queryByTestId('detail-fab')).not.toBeOnTheScreen();
  });

  it('opens the add sheet on the current playlist and the gallery writes', async () => {
    const { view } = await renderDetail();

    await fireEvent.press(screen.getByTestId('detail-fab'));
    await fireEvent.press(screen.getByTestId('detail-add-track'));
    await waitFor(() => {
      expect(screen.getByTestId('add-track-sheet')).toBeOnTheScreen();
    });

    const boxes = within(screen.getByTestId('add-track-pick')).getAllByRole(
      'checkbox'
    );

    expect(boxes.map(box => box.props.accessibilityLabel)).toEqual([
      'Rain On The Window',
      'Late Night Jazz'
    ]);
    expect(boxes[0]).toBeChecked();
    view.unmount();
  });

  it('caps the add picker at the gallery first page', async () => {
    const third: Playlist = {
      ...playlist,
      id: 'playlist-4',
      name: 'Third write',
      access: ShareLevel.Write
    };

    const { view } = await renderDetail({
      gallery: {
        items: [playlist, writableOther, third],
        total: 3,
        limit: 2,
        offset: 0
      }
    });

    await fireEvent.press(screen.getByTestId('detail-fab'));
    await fireEvent.press(screen.getByTestId('detail-add-track'));
    await waitFor(() => {
      expect(screen.getByTestId('add-track-sheet')).toBeOnTheScreen();
    });

    expect(
      screen.queryByTestId('add-track-pick-playlist-4')
    ).not.toBeOnTheScreen();
    expect(screen.getByTestId('add-track-first-page')).toHaveTextContent(
      /first 2 playlists/
    );
    view.unmount();
  });

  it('sends one batch and closes the sheet on a clean result', async () => {
    const result: AddTrackResult = {
      results: [{ playlistId: 'playlist-1', outcome: AddTrackOutcome.Added }]
    };
    const { addMutate } = await renderDetail();
    const mutate = addMutate as unknown as {
      mockImplementation: (
        fn: (
          input: { url: string; playlistIds: string[] },
          options: { onSuccess?: (answer: AddTrackResult) => void }
        ) => void
      ) => void;
    };

    mutate.mockImplementation((_input, options) => {
      options.onSuccess?.(result);
    });

    await fireEvent.press(screen.getByTestId('detail-fab'));
    await fireEvent.press(screen.getByTestId('detail-add-track'));
    await waitFor(() => {
      expect(screen.getByTestId('add-track-sheet')).toBeOnTheScreen();
    });
    await fireEvent.changeText(
      screen.getByLabelText('Video link'),
      'https://youtube.com/watch?v=dQw4w9WgXcQ'
    );
    await waitFor(() => {
      expect(screen.getByTestId('add-track-submit')).toBeEnabled();
    });
    await fireEvent.press(screen.getByTestId('add-track-submit'));

    expect(addMutate).toHaveBeenCalledWith(
      {
        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        playlistIds: ['playlist-1']
      },
      expect.any(Object)
    );
    await waitFor(() => {
      expect(screen.queryByTestId('add-track-sheet')).not.toBeOnTheScreen();
    });
  });

  it('keeps the add sheet open with the outcomes of a mixed batch', async () => {
    const result: AddTrackResult = {
      results: [
        { playlistId: 'playlist-1', outcome: AddTrackOutcome.Added },
        { playlistId: 'playlist-2', outcome: AddTrackOutcome.Refused }
      ]
    };
    const { addMutate, view } = await renderDetail({ addResult: result });
    const mutate = addMutate as unknown as {
      mockImplementation: (
        fn: (
          input: { url: string; playlistIds: string[] },
          options: { onSuccess?: (answer: AddTrackResult) => void }
        ) => void
      ) => void;
    };

    mutate.mockImplementation((_input, options) => {
      options.onSuccess?.(result);
    });

    await fireEvent.press(screen.getByTestId('detail-fab'));
    await fireEvent.press(screen.getByTestId('detail-add-track'));
    await waitFor(() => {
      expect(screen.getByTestId('add-track-sheet')).toBeOnTheScreen();
    });
    await fireEvent.changeText(
      screen.getByLabelText('Video link'),
      'https://youtube.com/watch?v=dQw4w9WgXcQ'
    );
    await fireEvent.press(screen.getByTestId('add-track-pick-playlist-2'));
    await waitFor(() => {
      expect(screen.getByTestId('add-track-submit')).toBeEnabled();
    });
    await fireEvent.press(screen.getByTestId('add-track-submit'));

    expect(
      screen.getByTestId('add-track-outcome-playlist-2')
    ).toBeOnTheScreen();
    expect(screen.getByTestId('add-track-sheet')).toBeOnTheScreen();
    expect(addMutate).toHaveBeenCalledWith(
      {
        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        playlistIds: ['playlist-1', 'playlist-2']
      },
      expect.any(Object)
    );

    view.unmount();
  });

  it('tracks the header without a tween when the system asks for less motion', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    await renderDetail();
    const frame = jest.spyOn(globalThis, 'requestAnimationFrame');

    await fireEvent.scroll(screen.getByTestId('playlist-scroll'), {
      nativeEvent: {
        contentOffset: { y: 1000 },
        contentSize: { height: 2000 },
        layoutMeasurement: { height: 400 }
      }
    });

    expect(frame).not.toHaveBeenCalled();
  });
});
