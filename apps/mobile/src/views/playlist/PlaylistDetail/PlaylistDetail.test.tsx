import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  within
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  type AccountSummary,
  AssociationOrigin,
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

import { ApiError } from '../../../api/apiClient/ApiClient';
import { useAccountDirectory } from '../../../api/useAccountDirectory';
import { useLatestSyncRun } from '../../../api/useLatestSyncRun';
import { usePlaylist } from '../../../api/usePlaylist';
import { usePlaylistTracks } from '../../../api/usePlaylistTracks';
import { useSyncPlaylist } from '../../../api/useSyncPlaylist';
import type { ApiConfig } from '../../../auth/useApiConfig';
import PlaylistDetail from './PlaylistDetail';

jest.mock('../../../api/usePlaylist', () => ({ usePlaylist: jest.fn() }));
jest.mock('../../../api/usePlaylistTracks', () => ({
  usePlaylistTracks: jest.fn()
}));
jest.mock('../../../api/useLatestSyncRun', () => ({
  useLatestSyncRun: jest.fn()
}));
jest.mock('../../../api/useSyncPlaylist', () => ({
  useSyncPlaylist: jest.fn()
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
const useLatestSyncRunMock = useLatestSyncRun as jest.MockedFunction<
  typeof useLatestSyncRun
>;
const useSyncPlaylistMock = useSyncPlaylist as jest.MockedFunction<
  typeof useSyncPlaylist
>;
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

interface RenderOptions {
  readonly playlist?: Playlist;
  readonly tracks?: typeof page;
  readonly latestRun?: SyncRun | null;
  readonly directory?: readonly AccountSummary[];
  readonly language?: Language;
  readonly pending?: boolean;
  readonly tracksPending?: boolean;
  readonly playlistError?: Error;
  readonly tracksError?: Error;
  readonly syncPending?: boolean;
  readonly onBack?: () => void;
}

async function renderDetail(options: RenderOptions = {}) {
  const onBack = options.onBack ?? jest.fn();
  const playlistRefetch = jest.fn();
  const tracksRefetch = jest.fn();
  const syncMutate = jest.fn();

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
  usePlaylistTracksMock.mockReturnValue(
    options.tracksError === undefined
      ? queryResult(
          options.tracksPending === true ? undefined : (options.tracks ?? page),
          options.tracksPending === true
            ? { isPending: true, isSuccess: false, data: undefined }
            : {}
        )
      : queryResult(undefined, {
          isPending: false,
          isSuccess: false,
          isError: true,
          error: options.tracksError,
          refetch: tracksRefetch
        })
  );
  useLatestSyncRunMock.mockReturnValue(queryResult(options.latestRun ?? null));
  useAccountDirectoryMock.mockReturnValue(queryResult(options.directory ?? []));
  useSyncPlaylistMock.mockReturnValue(
    mutationResult({
      mutate: syncMutate,
      isPending: options.syncPending === true
    })
  );

  await render(
    <I18nProvider
      initialLanguage={options.language ?? Language.English}
      storage={store}>
      <SafeAreaProvider initialMetrics={metrics}>
        <PlaylistDetail
          config={config}
          playlistId="playlist-1"
          onBack={onBack}
          now={now}
        />
      </SafeAreaProvider>
    </I18nProvider>
  );

  return { onBack, playlistRefetch, tracksRefetch, syncMutate };
}

beforeEach(() => {
  jest.clearAllMocks();
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

  it('draws the start controls disabled until their ticket', async () => {
    await renderDetail();

    expect(screen.getByTestId('detail-play')).toBeDisabled();
    expect(screen.getByTestId('detail-shuffle')).toBeDisabled();
    expect(screen.getByLabelText('Play this playlist')).toBeDisabled();
    expect(screen.getByLabelText('Shuffle Rain On The Window')).toBeDisabled();
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

  it('reads the route id', async () => {
    await renderDetail();

    expect(usePlaylistMock).toHaveBeenCalledWith('playlist-1');
    expect(usePlaylistTracksMock).toHaveBeenCalledWith('playlist-1');
    expect(useLatestSyncRunMock).toHaveBeenCalledWith('playlist-1');
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
});
