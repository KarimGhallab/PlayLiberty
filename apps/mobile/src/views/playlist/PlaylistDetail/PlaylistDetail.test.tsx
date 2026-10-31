import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
  ShareLevel,
  type SyncRun,
  SyncRunStatus,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import { copyText } from '../../../shared/clipboard/copyText';
import { tokenLength, tokenNumber } from '../../../shared/styles/tokens';

import { ApiError } from '../../../api/apiClient/ApiClient';
import { useAccount } from '../../../api/useAccount';
import { useAccountDirectory } from '../../../api/useAccountDirectory';
import { useAccountPage } from '../../../api/useAccountPage/useAccountPage';
import { useAddTrack } from '../../../api/useAddTrack';
import { useDeletePlaylist } from '../../../api/useDeletePlaylist';
import { useFetchTrackWhole } from '../../../api/useFetchTrackWhole';
import { useGrantShare } from '../../../api/useGrantShare';
import { useLatestSyncRun } from '../../../api/useLatestSyncRun';
import { usePlaylist } from '../../../api/usePlaylist';
import { usePlaylistQueue } from '../../../api/usePlaylistQueue';
import { usePlaylistShares } from '../../../api/usePlaylistShares';
import { usePlaylistTracks } from '../../../api/usePlaylistTracks/usePlaylistTracks';
import { usePlaylists } from '../../../api/usePlaylists/usePlaylists';
import { useRemovePlaylistCover } from '../../../api/useRemovePlaylistCover';
import { useRemoveTrack } from '../../../api/useRemoveTrack';
import { useRenamePlaylist } from '../../../api/useRenamePlaylist';
import { useRetryFailedTracks } from '../../../api/useRetryFailedTracks';
import { useRetryTrack } from '../../../api/useRetryTrack';
import { useRevokeShare } from '../../../api/useRevokeShare';
import { useSetPlaylistCover } from '../../../api/useSetPlaylistCover';
import { useSyncPlaylist } from '../../../api/useSyncPlaylist';
import { useUpdateSkipNonMusic } from '../../../api/useUpdateSkipNonMusic/useUpdateSkipNonMusic';
import { useUpdateSort } from '../../../api/useUpdateSort';
import type { ApiConfig } from '../../../auth/useApiConfig';
import { playerBarHeight } from '../../../player/playerBarSize/playerBarSize';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import { galleryAddActionSize } from '../../library/GalleryAddAction/GalleryAddAction';
import PlaylistDetail from './PlaylistDetail';

jest.mock('../../../api/usePlaylist', () => ({ usePlaylist: jest.fn() }));
jest.mock('../../../api/usePlaylistTracks/usePlaylistTracks', () => ({
  usePlaylistTracks: jest.fn()
}));
jest.mock('../../../api/usePlaylistQueue', () => ({
  usePlaylistQueue: jest.fn()
}));
jest.mock('../../../api/usePlaylists/usePlaylists', () => ({
  usePlaylists: jest.fn()
}));
jest.mock('../../../api/useAddTrack', () => ({
  useAddTrack: jest.fn()
}));
jest.mock('../../../api/useLatestSyncRun', () => ({
  useLatestSyncRun: jest.fn()
}));
jest.mock('../../../api/useSyncPlaylist', () => ({
  useSyncPlaylist: jest.fn()
}));
jest.mock('../../../api/useRetryTrack', () => ({
  useRetryTrack: jest.fn()
}));
jest.mock('../../../api/useFetchTrackWhole', () => ({
  useFetchTrackWhole: jest.fn()
}));
jest.mock('../../../api/useRemoveTrack', () => ({
  useRemoveTrack: jest.fn()
}));
jest.mock('../../../api/usePlaylistShares', () => ({
  usePlaylistShares: jest.fn()
}));

jest.mock('../../../api/useAccount', () => ({
  useAccount: jest.fn()
}));

jest.mock('../../../api/useAccountPage/useAccountPage', () => ({
  useAccountPage: jest.fn()
}));

jest.mock('../../../api/useGrantShare', () => ({
  useGrantShare: jest.fn()
}));
jest.mock('../../../api/useRevokeShare', () => ({
  useRevokeShare: jest.fn()
}));
jest.mock('../../../api/useRenamePlaylist', () => ({
  useRenamePlaylist: jest.fn()
}));
jest.mock('../../../api/useDeletePlaylist', () => ({
  useDeletePlaylist: jest.fn()
}));
jest.mock('../../../api/useSetPlaylistCover', () => ({
  useSetPlaylistCover: jest.fn()
}));
jest.mock('../../../api/useRemovePlaylistCover', () => ({
  useRemovePlaylistCover: jest.fn()
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
jest.mock('../../../api/useUpdateSort', () => ({
  useUpdateSort: jest.fn()
}));
jest.mock('../../../api/useUpdateSkipNonMusic/useUpdateSkipNonMusic', () => ({
  useUpdateSkipNonMusic: jest.fn()
}));
jest.mock('../../../api/useRetryFailedTracks', () => ({
  useRetryFailedTracks: jest.fn()
}));
jest.mock('../../../shared/clipboard/copyText', () => ({
  copyText: jest.fn()
}));
jest.mock('../../../api/useAccountDirectory', () => {
  const actual = jest.requireActual<
    typeof import('../../../api/useAccountDirectory')
  >('../../../api/useAccountDirectory');

  return { ...actual, useAccountDirectory: jest.fn() };
});

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
  counts
};

const emptyPage = {
  items: [],
  total: 0,
  limit: 100,
  offset: 0,
  counts: emptyCounts
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
  readonly filteredTracks?: Partial<Record<TrackFileStatus, typeof page>>;
  readonly queue?: readonly PlaylistTrack[];
  readonly queueError?: Error;
  readonly queuePending?: boolean;
  readonly queueRefetch?: 'resolve' | 'reject' | 'hold';
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

type QueueReadResult = {
  readonly data: { readonly items: readonly PlaylistTrack[] } | undefined;
  readonly error: Error | null;
};

async function renderDetail(options: RenderOptions = {}) {
  const onBack = options.onBack ?? jest.fn();
  const playlistRefetch = jest.fn();
  const tracksRefetch = jest.fn();
  const tracksFetchNextPage = jest.fn();
  const syncMutate = jest.fn();
  const retryMutate = jest.fn();
  const fetchWholeMutate = jest.fn();
  const removeMutate = jest.fn();
  const deleteMutate = jest.fn();
  const renameMutate = jest.fn();
  jest.mocked(useSetPlaylistCover).mockReturnValue(mutationResult());
  jest.mocked(useRemovePlaylistCover).mockReturnValue(mutationResult());
  usePlaylistSharesMock.mockReturnValue(queryResult([]));
  useRevokeShareMock.mockReturnValue(mutationResult());
  jest.mocked(useAccount).mockReturnValue(
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
  const queueRefetch = jest.fn<() => Promise<QueueReadResult>>();
  const queueItems = options.queue ?? [track];
  const queueBehaviour =
    options.queueRefetch ??
    (options.queueError === undefined ? 'resolve' : 'reject');

  if (queueBehaviour === 'resolve') {
    queueRefetch.mockResolvedValue({
      data: { items: queueItems },
      error: null
    });
  } else if (queueBehaviour === 'reject') {
    queueRefetch.mockRejectedValue(
      options.queueError ?? new Error('The queue read failed.')
    );
  } else {
    queueRefetch.mockReturnValue(new Promise<QueueReadResult>(() => {}));
  }

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
  const pageFor = (state?: TrackFileStatus) => {
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
          refetch: queueRefetch
        })
      : options.queuePending === true
        ? queryResult(undefined, {
            isPending: true,
            isSuccess: false,
            isError: false,
            data: undefined,
            refetch: queueRefetch
          })
        : queryResult({ items: queueItems })
  );
  usePlaylistsMock.mockReturnValue(queryResult(options.gallery ?? galleryPage));
  useLatestSyncRunMock.mockReturnValue(queryResult(options.latestRun ?? null));
  useAccountDirectoryMock.mockReturnValue(queryResult(options.directory ?? []));
  useSyncPlaylistMock.mockReturnValue(
    mutationResult({
      mutate: syncMutate,
      isPending: options.syncPending === true
    })
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

  const view = await render(
    <I18nProvider
      initialLanguage={options.language ?? Language.English}
      storage={store}>
      <SafeAreaProvider initialMetrics={metrics}>
        <PlaylistDetail
          config={config}
          playlistId="playlist-1"
          onBack={onBack}
          now={now}
          undoWindowMs={options.undoWindowMs}
        />
      </SafeAreaProvider>
    </I18nProvider>
  );

  return {
    onBack,
    playlistRefetch,
    tracksRefetch,
    tracksFetchNextPage,
    syncMutate,
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
  jest.restoreAllMocks();
  jest.clearAllMocks();
  copyTextMock.mockReset();
  usePlayerStore.setState({
    queue: [],
    sourceQueue: [],
    playlistId: null,
    currentId: null,
    shuffle: false
  });
});

describe('the playlist detail', () => {
  it('draws the identity and the first rows in one scroll', async () => {
    await renderDetail();

    expect(screen.getByTestId('playlist-screen')).toBeOnTheScreen();

    const scroll = screen.getByTestId('playlist-scroll');

    expect(within(scroll).getByTestId('playlist-identity')).toBeOnTheScreen();
    expect(within(scroll).getByTestId('track-row')).toBeOnTheScreen();
    expect(screen.getByText('Rain On The Window')).toBeOnTheScreen();
    expect(screen.getByText('12 tracks')).toBeOnTheScreen();
    expect(screen.getByText('Up to date')).toBeOnTheScreen();
    expect(screen.getByText('Synced 2 days ago')).toBeOnTheScreen();
    expect(screen.getByText('First Song')).toBeOnTheScreen();
    expect(screen.getByText('3:02')).toBeOnTheScreen();
  });

  it('draws the skip setting inside the identity and writes the flip', async () => {
    const { skipMutate } = await renderDetail();

    const setting = within(screen.getByTestId('playlist-identity')).getByTestId(
      'skip-setting'
    );

    expect(setting.props.accessibilityState).toMatchObject({ checked: true });

    fireEvent.press(setting);

    expect(skipMutate).toHaveBeenCalledWith(false, expect.any(Object));
  });

  it('keeps the skip setting, disabled, for a read collaborator', async () => {
    await renderDetail({
      playlist: { ...playlist, access: ShareLevel.Read }
    });

    expect(screen.getByText('Skip non-music parts')).toBeOnTheScreen();
    expect(screen.getByTestId('skip-setting')).toBeDisabled();
  });

  it('explains a refused skip setting in French', async () => {
    const failure = new ApiError(503, {
      type: 'about:blank',
      title: 'Service unavailable',
      status: 503,
      code: ProblemCode.InternalError,
      detail: 'Le paramètre est indisponible.'
    });
    const { skipMutate } = await renderDetail({ language: Language.French });
    const mutate = skipMutate as unknown as {
      mockImplementation: (
        fn: (
          skipNonMusic: boolean,
          options: { onError?: (error: Error) => void }
        ) => void
      ) => void;
    };

    mutate.mockImplementation((_skipNonMusic, options) => {
      options.onError?.(failure);
    });

    expect(
      screen.getByText('Ignorer les parties non musicales')
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('skip-setting'));

    await waitFor(() => {
      expect(
        screen.getByText("Le paramètre n'a pas été modifié.")
      ).toBeOnTheScreen();
    });
    expect(
      screen.getByTestId('skip-setting').props.accessibilityState
    ).toMatchObject({ checked: true });
  });

  it('draws the sort and the chips below the identity in one rail', async () => {
    await renderDetail();
    const scroll = screen.getByTestId('playlist-scroll');

    expect(
      within(scroll)
        .getAllByTestId(/^playlist-(identity|controls)$/)
        .map(node => node.props.testID)
    ).toEqual(['playlist-identity', 'playlist-controls']);
    expect(screen.getByTestId('playlist-filter-rail').props.horizontal).toBe(
      true
    );
    expect(screen.getByTestId('playlist-filter-divider')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sort by: Playlist order')).toBeOnTheScreen();
    expect(screen.getByTestId('filter-all').props.accessibilityLabel).toBe(
      'All 1'
    );
    expect(screen.getByTestId('filter-failed').props.accessibilityLabel).toBe(
      'Failed 0'
    );
  });

  it('filters the read by state while the chips keep the whole counts', async () => {
    await renderDetail({
      filteredTracks: {
        [TrackFileStatus.Failed]: {
          ...page,
          items: [failedTrack],
          total: 1,
          counts
        }
      }
    });

    fireEvent.press(screen.getByTestId('filter-failed'));

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
    ).toMatchObject({ selected: true });
    expect(
      screen.getByTestId('filter-all').props.accessibilityState
    ).toMatchObject({ selected: false });
  });

  it('names an empty filter and returns the whole list from Show all', async () => {
    await renderDetail({
      filteredTracks: {
        [TrackFileStatus.Failed]: { ...emptyPage, counts }
      }
    });

    fireEvent.press(screen.getByTestId('filter-failed'));

    await waitFor(() => {
      expect(screen.getByTestId('filter-empty')).toBeOnTheScreen();
    });
    expect(screen.getByText('No failed tracks')).toBeOnTheScreen();
    expect(screen.getByText('Show all')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('filter-show-all'));

    await waitFor(() => {
      expect(usePlaylistTracksMock).toHaveBeenLastCalledWith(
        'playlist-1',
        undefined
      );
    });
    expect(screen.queryByTestId('filter-empty')).not.toBeOnTheScreen();
  });

  it('writes the chosen sort from the sheet', async () => {
    const { sortMutate } = await renderDetail();

    fireEvent.press(screen.getByTestId('detail-sort'));
    await waitFor(() => {
      expect(screen.getByTestId('playlist-sort-sheet')).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('playlist-sort-newest'));

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

    fireEvent.press(screen.getByTestId('detail-sort'));
    await waitFor(() => {
      expect(screen.getByTestId('playlist-sort-sheet')).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByTestId('playlist-sort-newest'));

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
    await renderDetail();

    expect(screen.getByTestId('detail-sort')).toBeDisabled();
    expect(screen.getByTestId('filter-all')).toBeDisabled();
    expect(screen.getByTestId('filter-failed')).toBeDisabled();
  });

  it('keeps the filter out of what Play starts', async () => {
    await renderDetail({
      queue: [track, secondTrack],
      filteredTracks: {
        [TrackFileStatus.Failed]: { ...emptyPage, counts }
      }
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-failed'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('detail-play'));
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
      currentId: 'track-1'
    });
    await renderDetail();

    expect(screen.getByText('Playing')).toBeOnTheScreen();
    expect(
      screen.getByTestId('track-bars', { includeHiddenElements: true })
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('track-play'));

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

  it('draws no Load more control and clears the add action under the last row', async () => {
    await renderDetail();

    expect(screen.queryByText('Load more')).not.toBeOnTheScreen();
    expect(
      screen.getByTestId('playlist-scroll').props.contentContainerStyle[1]
        .paddingBottom
    ).toBe(
      tokenLength('space-4') + galleryAddActionSize + tokenLength('space-3')
    );
  });

  it('clears the player bar under the last row and the add action', async () => {
    usePlayerStore.getState().start(
      [
        {
          id: 'track-1',
          title: 'First Song',
          durationSeconds: 182,
          thumbnailPath: null
        }
      ],
      { id: 'playlist-1', name: 'Rain On The Window' },
      'track-1'
    );
    await renderDetail();

    expect(
      screen.getByTestId('playlist-scroll').props.contentContainerStyle[1]
        .paddingBottom
    ).toBe(
      tokenLength('space-4') +
        galleryAddActionSize +
        tokenLength('space-3') +
        playerBarHeight
    );
    expect(screen.getByTestId('detail-add-track')).toHaveStyle({
      bottom: tokenLength('space-4') + playerBarHeight
    });
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

    fireEvent.press(screen.getByTestId('tracks-append-retry'));
    expect(tracksFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('lands on the current row once when this playlist is the queue', async () => {
    usePlayerStore.setState({
      queue: ['track-1', 'track-2', 'track-3'],
      playlistId: 'playlist-1',
      currentId: 'track-2'
    });
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
    await renderDetail({
      tracks: { ...page, items: [track, secondTrack, thirdTrack], total: 3 },
      queue: [track, secondTrack, thirdTrack]
    });

    const slot = screen.getByTestId('track-slot-track-2');
    const layout = {
      nativeEvent: { layout: { x: 0, y: 500, width: 300, height: 72 } }
    };

    expect(screen.queryByTestId('playlist-skeleton')).not.toBeOnTheScreen();

    await fireEvent(slot, 'layout', layout);

    expect(scrollTo).toHaveBeenCalledWith({
      y: 500 - tokenLength('space-4'),
      animated: false
    });

    await fireEvent(slot, 'layout', layout);
    expect(scrollTo).toHaveBeenCalledTimes(1);
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
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
    await renderDetail();

    await fireEvent(screen.getByTestId('track-slot-track-1'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 500, width: 300, height: 72 } }
    });

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('draws no play control for an unplayable row', async () => {
    await renderDetail({
      tracks: { ...page, items: [failedTrack], total: 1 },
      queue: []
    });

    expect(screen.queryByTestId('track-play')).not.toBeOnTheScreen();
    expect(screen.getByText('First Song')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('track-row')).getByText('Failed')
    ).toBeOnTheScreen();
  });

  async function openFailedSheet(options: RenderOptions = {}) {
    const result = await renderDetail({
      tracks: { ...page, items: [failedTrack], total: 1 },
      queue: [],
      ...options
    });

    fireEvent.press(screen.getByTestId('track-actions'));

    await waitFor(() => {
      expect(screen.getByTestId('track-actions-sheet')).toBeOnTheScreen();
    });

    return result;
  }

  async function openStoredSheet(options: RenderOptions = {}) {
    const result = await renderDetail(options);

    fireEvent.press(screen.getByTestId('track-actions'));

    await waitFor(() => {
      expect(screen.getByTestId('track-actions-sheet')).toBeOnTheScreen();
    });

    return result;
  }

  async function openHeaderSheet(options: RenderOptions = {}) {
    const result = await renderDetail(options);

    fireEvent.press(screen.getByTestId('detail-actions'));

    await waitFor(() => {
      expect(screen.getByTestId('playlist-actions-sheet')).toBeOnTheScreen();
    });

    return result;
  }

  async function openRenameSheet(options: RenderOptions = {}) {
    const result = await openHeaderSheet(options);

    fireEvent.press(screen.getByTestId('playlist-action-rename'));

    await waitFor(() => {
      expect(screen.getByTestId('rename-sheet')).toBeOnTheScreen();
    });

    return result;
  }

  /* React 19 defers the state an event writes, so the test waits for the field
   * to hold what was typed before pressing Save. */
  async function typeRename(value: string) {
    fireEvent.changeText(screen.getByLabelText('Playlist name'), value);

    await waitFor(
      () => {
        expect(screen.getByLabelText('Playlist name')).toHaveDisplayValue(
          value
        );
      },
      { timeout: 3000 }
    );
  }

  it('draws copy, the two repairs and Remove on a failed row', async () => {
    await openFailedSheet();

    expect(screen.getByTestId('track-action-copy')).toBeOnTheScreen();
    expect(screen.getByTestId('track-action-retry')).toBeOnTheScreen();
    expect(screen.getByTestId('track-action-fetchWhole')).toBeOnTheScreen();
    expect(screen.getByTestId('track-action-remove')).toBeOnTheScreen();
  });

  it('draws only copy for a read collaborator', async () => {
    await openFailedSheet({
      playlist: { ...playlist, access: ShareLevel.Read }
    });

    expect(screen.getByTestId('track-action-copy')).toBeOnTheScreen();
    expect(screen.queryByTestId('track-action-retry')).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId('track-action-fetchWhole')
    ).not.toBeOnTheScreen();
    expect(screen.queryByTestId('track-action-remove')).not.toBeOnTheScreen();
  });

  it('draws only copy while the row is busy', async () => {
    await openFailedSheet({
      retryPending: true,
      retryVariables: 'track-1'
    });

    expect(screen.getByTestId('track-action-copy')).toBeOnTheScreen();
    expect(screen.queryByTestId('track-action-retry')).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId('track-action-fetchWhole')
    ).not.toBeOnTheScreen();
    expect(screen.queryByTestId('track-action-remove')).not.toBeOnTheScreen();
  });

  it('copies the track absolute link and confirms', async () => {
    copyTextMock.mockResolvedValue(true);
    await openFailedSheet();

    fireEvent.press(screen.getByTestId('track-action-copy'));

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

    fireEvent.press(screen.getByTestId('track-action-copy'));

    await waitFor(() => {
      expect(
        screen.getByText('The link could not be copied.')
      ).toBeOnTheScreen();
    });
  });

  it('retries the failed track', async () => {
    const { retryMutate } = await openFailedSheet();

    fireEvent.press(screen.getByTestId('track-action-retry'));

    expect(retryMutate).toHaveBeenCalledWith('track-1', expect.any(Object));
  });

  it('fetches the failed track whole', async () => {
    const { fetchWholeMutate } = await openFailedSheet();

    fireEvent.press(screen.getByTestId('track-action-fetchWhole'));

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

    fireEvent.press(screen.getByTestId('track-action-retry'));

    await waitFor(() => {
      expect(
        screen.getByText('The track could not be retried.')
      ).toBeOnTheScreen();
    });
  });

  it('removes the row at once and Undo restores it without a request', async () => {
    const { removeMutate } = await openStoredSheet();

    fireEvent.press(screen.getByTestId('track-action-remove'));

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

    fireEvent.press(screen.getByTestId('undo-snackbar-action'));

    await waitFor(() => {
      expect(screen.getByTestId('track-row')).toBeOnTheScreen();
    });
    expect(removeMutate).not.toHaveBeenCalled();
  });

  it('commits the removal after the window', async () => {
    const { removeMutate } = await openStoredSheet({ undoWindowMs: 20 });

    fireEvent.press(screen.getByTestId('track-action-remove'));

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

    fireEvent.press(screen.getByTestId('track-action-remove'));

    await waitFor(() => {
      expect(
        screen.getByText('The track could not be removed.')
      ).toBeOnTheScreen();
    });
    expect(screen.getByTestId('track-row')).toBeOnTheScreen();
  });

  it('dims the detail for a delete and Undo restores it', async () => {
    const { deleteMutate } = await openHeaderSheet();

    fireEvent.press(screen.getByTestId('playlist-action-delete'));

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

    fireEvent.press(screen.getByTestId('undo-snackbar-action'));

    await waitFor(() => {
      expect(screen.queryByTestId('undo-snackbar')).not.toBeOnTheScreen();
    });
    expect(deleteMutate).not.toHaveBeenCalled();
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

    fireEvent.press(screen.getByTestId('playlist-action-delete'));

    await waitFor(() => {
      expect(deleteMutate).toHaveBeenCalledWith(
        'playlist-1',
        expect.any(Object)
      );
    });
    expect(onBack).toHaveBeenCalledTimes(1);
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

    fireEvent.press(screen.getByTestId('playlist-action-delete'));

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

  it('draws the overflow for the owner and a write collaborator', async () => {
    await renderDetail();
    expect(screen.getByTestId('detail-actions')).toBeOnTheScreen();

    await renderDetail({
      playlist: { ...playlist, access: ShareLevel.Write }
    });
    expect(screen.getByTestId('detail-actions')).toBeOnTheScreen();
  });

  it('offers the owner share, rename, cover, sync and delete, without the pin', async () => {
    await openHeaderSheet();

    for (const key of ['share', 'rename', 'cover', 'sync', 'delete']) {
      expect(screen.getByTestId(`playlist-action-${key}`)).toBeOnTheScreen();
    }
    expect(screen.queryByTestId('playlist-action-pin')).not.toBeOnTheScreen();
  });

  it('offers a write collaborator cover and sync alone', async () => {
    await openHeaderSheet({
      playlist: { ...playlist, access: ShareLevel.Write }
    });

    expect(screen.getByTestId('playlist-action-cover')).toBeOnTheScreen();
    expect(screen.getByTestId('playlist-action-sync')).toBeOnTheScreen();
    expect(screen.queryByTestId('playlist-action-share')).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId('playlist-action-rename')
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId('playlist-action-delete')
    ).not.toBeOnTheScreen();
    expect(screen.queryByTestId('playlist-action-pin')).not.toBeOnTheScreen();
  });

  it('starts the playlist sync from the sheet and closes it on success', async () => {
    const { syncMutate } = await openHeaderSheet();
    const mutate = syncMutate as unknown as {
      mockImplementation: (
        fn: (playlistId: string, options: { onSuccess?: () => void }) => void
      ) => void;
    };

    mutate.mockImplementation((_playlistId, options) => {
      options.onSuccess?.();
    });

    fireEvent.press(screen.getByTestId('playlist-action-sync'));

    expect(syncMutate).toHaveBeenCalledWith('playlist-1', expect.any(Object));
    await waitFor(() => {
      expect(
        screen.queryByTestId('playlist-actions-sheet')
      ).not.toBeOnTheScreen();
    });
  });

  it('keeps a refused sync in the sheet with the problem sentence', async () => {
    const failure = new ApiError(503, {
      type: 'about:blank',
      title: 'Service unavailable',
      status: 503,
      code: ProblemCode.InternalError,
      detail: 'The playlist could not be synced.'
    });
    const { syncMutate } = await openHeaderSheet();
    const mutate = syncMutate as unknown as {
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

    fireEvent.press(screen.getByTestId('playlist-action-sync'));

    await waitFor(() => {
      expect(screen.getByTestId('playlist-actions-problem')).toHaveTextContent(
        'The playlist could not be synced.'
      );
    });
    expect(screen.getByTestId('playlist-actions-sheet')).toBeOnTheScreen();
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
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

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
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The playlist could not be renamed.'
      );
    });
    expect(screen.getByTestId('rename-sheet')).toBeOnTheScreen();
  });

  it('opens the share sheet from the detail', async () => {
    await openHeaderSheet();

    fireEvent.press(screen.getByTestId('playlist-action-share'));

    await waitFor(() => {
      expect(screen.getByTestId('share-sheet')).toBeOnTheScreen();
    });
    expect(
      screen.getByRole('header', { name: 'Share playlist' })
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('share-done'));
    await waitFor(() => {
      expect(screen.queryByTestId('share-sheet')).not.toBeOnTheScreen();
    });
  });

  it('opens the cover sheet from the detail', async () => {
    await openHeaderSheet();

    fireEvent.press(screen.getByTestId('playlist-action-cover'));

    await waitFor(() => {
      expect(
        screen.getByRole('header', { name: 'Playlist cover' })
      ).toBeOnTheScreen();
    });
    expect(
      screen.getByTestId('cover-save').props.accessibilityState
    ).toMatchObject({ disabled: true });

    fireEvent.press(screen.getByTestId('cover-backdrop'));
    await waitFor(() => {
      expect(
        screen.queryByRole('header', { name: 'Playlist cover' })
      ).not.toBeOnTheScreen();
    });
  });

  it('draws no header actions for a read collaborator', async () => {
    await renderDetail({
      playlist: { ...playlist, access: ShareLevel.Read }
    });

    expect(screen.queryByTestId('detail-actions')).not.toBeOnTheScreen();
  });

  it('renders the delete window in French', async () => {
    await renderDetail({ language: Language.French });

    fireEvent.press(screen.getByTestId('detail-actions'));

    await waitFor(() => {
      expect(screen.getByTestId('playlist-actions-sheet')).toBeOnTheScreen();
    });

    expect(screen.getByText('Supprimer')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('playlist-action-delete'));

    await waitFor(() => {
      expect(screen.getByTestId('undo-snackbar')).toBeOnTheScreen();
    });
    expect(screen.getByText('Suppression de la playlist')).toBeOnTheScreen();
    expect(screen.getByText('Annuler')).toBeOnTheScreen();
  });

  it('draws the cover with the session headers', async () => {
    await renderDetail();

    const image = screen.getByTestId('playlist-cover-image');

    expect(image.props.source.uri).toBe(
      'https://instance.test/api/v1/playlists/playlist-1/cover?v=2026-10-01T00%3A00%3A00.000Z'
    );
    expect(image.props.source.headers).toEqual({
      'P-Access-Token-Id': 'token-id',
      'P-Access-Token': 'token-secret'
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
    expect(screen.getByLabelText('Loading tracks.')).toBeOnTheScreen();
    expect(screen.queryByTestId('playlist-identity')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('track-row')).not.toBeOnTheScreen();
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

    fireEvent.press(screen.getByRole('button', { name: 'Back to home' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('draws the playlist read failure with its own retry', async () => {
    const { playlistRefetch } = await renderDetail({
      playlistError: playlistFailure
    });

    expect(screen.getByText('The playlist is unavailable.')).toBeOnTheScreen();
    expect(screen.queryByTestId('playlist-identity')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('read-failure-retry'));
    expect(playlistRefetch).toHaveBeenCalledTimes(1);
  });

  it('draws the tracks read failure with its own retry', async () => {
    const { tracksRefetch } = await renderDetail({
      tracksError: tracksFailure
    });

    expect(screen.getByTestId('playlist-identity')).toBeOnTheScreen();
    expect(screen.getByText('The tracks are unavailable.')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('read-failure-retry'));
    expect(tracksRefetch).toHaveBeenCalledTimes(1);
  });

  it('offers Sync now on a never-synced empty playlist', async () => {
    const { syncMutate } = await renderDetail({
      playlist: neverSynced,
      tracks: emptyPage
    });

    expect(screen.getByTestId('playlist-empty')).toBeOnTheScreen();
    expect(screen.getByText('Nothing here yet')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('empty-sync'));
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
    expect(screen.getByText('Syncing')).toBeOnTheScreen();
  });

  it('starts at the first playable track from the whole queue', async () => {
    await renderDetail({
      tracks: { ...page, items: [failedTrack], total: 1 },
      queue: [failedTrack, secondTrack, thirdTrack]
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('detail-play'));
    });

    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBe('track-2');
    });

    const state = usePlayerStore.getState();

    expect(state.queue).toEqual(['track-2', 'track-3']);
    expect(state.playlistId).toBe('playlist-1');
    expect(state.shuffle).toBe(false);
  });

  it('shuffles every playable track from a random one', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    await renderDetail({
      queue: [track, secondTrack, thirdTrack]
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('detail-shuffle'));
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
      screen.getAllByTestId('track-title').map(node => node.props.children);

    expect(titles()).toEqual(['Third Song', 'Second Song', 'First Song']);
    expect(
      screen.getByTestId('detail-shuffle').props.accessibilityState
    ).toMatchObject({ selected: true, disabled: false });

    fireEvent.press(screen.getByTestId('detail-shuffle'));

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
      fireEvent.press(screen.getByTestId('detail-play'));
    });

    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBe('track-1');
    });
    expect(usePlayerStore.getState().queue).toEqual(['track-1']);
  });

  it('reports the start waiting on its queue read', async () => {
    await renderDetail({ queuePending: true, queueRefetch: 'hold' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('detail-play'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('detail-play')).toBeDisabled();
    });
    expect(screen.getByTestId('detail-shuffle')).toBeDisabled();
    expect(screen.getByTestId('detail-play').props.accessibilityState).toEqual({
      disabled: true,
      busy: true
    });
  });

  it('reports the shuffle waiting on its queue read', async () => {
    await renderDetail({ queuePending: true, queueRefetch: 'hold' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('detail-shuffle'));
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
      fireEvent.press(screen.getByTestId('detail-play'));
    });

    await waitFor(() => {
      expect(screen.getByText(/could not be read/)).toBeOnTheScreen();
    });
  });

  it('renders the start failure in French', async () => {
    const queueFailure = new ApiError(503, {
      type: 'about:blank',
      title: 'Service unavailable',
      status: 503,
      code: ProblemCode.InternalError,
      detail: 'The queue is unavailable.'
    });
    await renderDetail({ language: Language.French, queueError: queueFailure });

    await act(async () => {
      fireEvent.press(screen.getByTestId('detail-play'));
    });

    await waitFor(() => {
      expect(screen.getByText(/n'a pas pu être lue/)).toBeOnTheScreen();
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

  it('draws the run band under the identity and above the controls', async () => {
    await renderDetail({ latestRun: completedRun });
    const scroll = screen.getByTestId('playlist-scroll');

    expect(
      within(scroll)
        .getAllByTestId(/^(playlist-(identity|controls)|sync-band)$/)
        .map(node => node.props.testID)
    ).toEqual(['playlist-identity', 'sync-band', 'playlist-controls']);
    expect(screen.getByText('Last sync 2 days ago')).toBeOnTheScreen();
    expect(screen.getByLabelText('3 kept')).toBeOnTheScreen();
  });

  it('retries a failed sync for a writer', async () => {
    const failedRun: SyncRun = {
      ...completedRun,
      status: SyncRunStatus.Failed,
      error: 'yt-dlp: HTTP 403'
    };
    const { syncMutate } = await renderDetail({
      playlist: { ...playlist, syncStatus: PlaylistSyncStatus.Error },
      latestRun: failedRun
    });

    expect(screen.queryByTestId('sync-cell-kept')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('sync-error-retry'));
    expect(syncMutate).toHaveBeenCalledWith('playlist-1');
  });

  it('retries the failed set from the band', async () => {
    const { retryFailedMutate } = await renderDetail({
      latestRun: completedRun,
      tracks: {
        ...page,
        counts: { ...counts, [TrackFileStatus.Failed]: 2 }
      }
    });

    fireEvent.press(screen.getByTestId('sync-retry-failed'));
    expect(retryFailedMutate).toHaveBeenCalledTimes(1);
  });

  it('draws no sync retry for a read collaborator', async () => {
    await renderDetail({
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

  it('renders the append loading in French', async () => {
    await renderDetail({
      language: Language.French,
      hasMore: true,
      fetchingNextPage: true
    });

    expect(screen.getByText('Chargement...')).toBeOnTheScreen();
  });

  it('renders the append retry in French', async () => {
    await renderDetail({
      language: Language.French,
      hasMore: true,
      fetchNextPageError: true
    });

    expect(screen.getByText('Réessayer')).toBeOnTheScreen();
  });

  it('renders the controls, sort sheet and empty filter in French', async () => {
    await renderDetail({
      language: Language.French,
      filteredTracks: {
        [TrackFileStatus.Failed]: { ...emptyPage, counts }
      }
    });

    expect(screen.getByText('Trier par')).toBeOnTheScreen();
    expect(screen.getByText('Toutes')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('filter-failed'));

    await waitFor(() => {
      expect(screen.getByText('Aucune piste en échec')).toBeOnTheScreen();
    });
    expect(screen.getByText('Tout afficher')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('detail-sort'));
    await waitFor(() => {
      expect(screen.getByText("Plus récentes d'abord")).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('playlist-sort-backdrop'));
    await waitFor(() => {
      expect(screen.queryByTestId('playlist-sort-sheet')).not.toBeOnTheScreen();
    });
  });

  it('renders the identity in French', async () => {
    await renderDetail({ language: Language.French });

    expect(screen.getByText('À jour')).toBeOnTheScreen();
    expect(screen.getByText('12 pistes')).toBeOnTheScreen();
    expect(screen.getByLabelText('Lire cette playlist')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Lecture aléatoire de Rain On The Window')
    ).toBeOnTheScreen();
  });

  it('renders the empty body in French', async () => {
    await renderDetail({
      language: Language.French,
      playlist: neverSynced,
      tracks: emptyPage
    });

    expect(screen.getByText('Rien pour le moment')).toBeOnTheScreen();
    expect(screen.getByText('Synchroniser')).toBeOnTheScreen();
  });

  it('renders the not-found body in French', async () => {
    await renderDetail({ language: Language.French, playlistError: notFound });

    expect(screen.getByText("Cette playlist n'est pas ici")).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: "Retour à l'accueil" })
    ).toBeOnTheScreen();
  });

  it('draws the add action for a writer', async () => {
    await renderDetail();

    expect(screen.getByTestId('detail-add-track')).toBeOnTheScreen();
    expect(screen.getByLabelText('Add a track')).toBeOnTheScreen();
  });

  it('draws no add action for a read collaborator', async () => {
    await renderDetail({
      playlist: { ...playlist, access: ShareLevel.Read }
    });

    expect(screen.queryByTestId('detail-add-track')).not.toBeOnTheScreen();
  });

  it('opens the add sheet on the current playlist and the gallery writes', async () => {
    const { view } = await renderDetail();

    fireEvent.press(screen.getByTestId('detail-add-track'));
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

    fireEvent.press(screen.getByTestId('detail-add-track'));
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

    fireEvent.press(screen.getByTestId('detail-add-track'));
    await waitFor(() => {
      expect(screen.getByTestId('add-track-sheet')).toBeOnTheScreen();
    });
    fireEvent.changeText(
      screen.getByLabelText('Video link'),
      'https://youtube.com/watch?v=dQw4w9WgXcQ'
    );
    await waitFor(() => {
      expect(screen.getByTestId('add-track-submit')).toBeEnabled();
    });
    fireEvent.press(screen.getByTestId('add-track-submit'));

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

    fireEvent.press(screen.getByTestId('detail-add-track'));
    await waitFor(() => {
      expect(screen.getByTestId('add-track-sheet')).toBeOnTheScreen();
    });
    fireEvent.changeText(
      screen.getByLabelText('Video link'),
      'https://youtube.com/watch?v=dQw4w9WgXcQ'
    );
    fireEvent.press(screen.getByTestId('add-track-pick-playlist-2'));
    await waitFor(() => {
      expect(screen.getByTestId('add-track-submit')).toBeEnabled();
    });
    fireEvent.press(screen.getByTestId('add-track-submit'));

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
});
