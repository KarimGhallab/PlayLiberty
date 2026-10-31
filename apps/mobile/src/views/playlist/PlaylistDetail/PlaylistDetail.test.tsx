import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  type AccountSummary,
  AssociationOrigin,
  type Playlist,
  PlaylistSort,
  PlaylistSyncStatus,
  type PlaylistTrack,
  Provider,
  ShareLevel,
  type SyncRun,
  SyncRunStatus,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import { useAccountDirectory } from '../../../api/useAccountDirectory';
import { useLatestSyncRun } from '../../../api/useLatestSyncRun';
import { usePlaylist } from '../../../api/usePlaylist';
import { usePlaylistTracks } from '../../../api/usePlaylistTracks';
import type { ApiConfig } from '../../../auth/useApiConfig';
import PlaylistDetail from './PlaylistDetail';

jest.mock('../../../api/usePlaylist', () => ({ usePlaylist: jest.fn() }));
jest.mock('../../../api/usePlaylistTracks', () => ({
  usePlaylistTracks: jest.fn()
}));
jest.mock('../../../api/useLatestSyncRun', () => ({
  useLatestSyncRun: jest.fn()
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

const page = {
  items: [track],
  total: 1,
  limit: 100,
  offset: 0,
  counts: {
    [TrackFileStatus.Stored]: 1,
    [TrackFileStatus.Pending]: 0,
    [TrackFileStatus.Downloading]: 0,
    [TrackFileStatus.Failed]: 0,
    [TrackFileStatus.Unavailable]: 0
  }
};

const bea: AccountSummary = {
  id: 'account-2',
  displayName: 'Bea',
  avatarUrl: null
};

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

interface RenderOptions {
  readonly playlist?: Playlist;
  readonly tracks?: typeof page;
  readonly latestRun?: SyncRun | null;
  readonly directory?: readonly AccountSummary[];
  readonly language?: Language;
  readonly pending?: boolean;
}

async function renderDetail(options: RenderOptions = {}) {
  usePlaylistMock.mockReturnValue(
    queryResult(
      options.playlist ?? playlist,
      options.pending === true
        ? { isPending: true, isSuccess: false, data: undefined }
        : {}
    )
  );
  usePlaylistTracksMock.mockReturnValue(queryResult(options.tracks ?? page));
  useLatestSyncRunMock.mockReturnValue(queryResult(options.latestRun ?? null));
  useAccountDirectoryMock.mockReturnValue(queryResult(options.directory ?? []));

  await render(
    <I18nProvider
      initialLanguage={options.language ?? Language.English}
      storage={store}>
      <SafeAreaProvider initialMetrics={metrics}>
        <PlaylistDetail config={config} playlistId="playlist-1" now={now} />
      </SafeAreaProvider>
    </I18nProvider>
  );
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

  it('keeps the frame for a pending read', async () => {
    await renderDetail({ pending: true });

    expect(screen.getByTestId('playlist-screen')).toBeOnTheScreen();
    expect(screen.queryByTestId('playlist-identity')).not.toBeOnTheScreen();
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
});
