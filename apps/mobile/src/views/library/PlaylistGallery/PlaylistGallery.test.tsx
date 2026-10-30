import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  type AccountSummary,
  type PlaylistPage,
  PlaylistSort,
  PlaylistSyncStatus,
  type PlaylistWithCounts,
  ProblemCode,
  Provider,
  ShareLevel
} from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import { ApiError } from '../../../api/apiClient/ApiClient';
import { useAccountDirectory } from '../../../api/useAccountDirectory';
import { usePlaylists } from '../../../api/usePlaylists';
import type { ApiConfig } from '../../../auth/useApiConfig';
import PlaylistGallery from './PlaylistGallery';

jest.mock('../../../api/usePlaylists', () => ({
  usePlaylists: jest.fn()
}));

jest.mock('../../../api/useAccountDirectory', () => {
  const actual = jest.requireActual<
    typeof import('../../../api/useAccountDirectory')
  >('../../../api/useAccountDirectory');

  return { ...actual, useAccountDirectory: jest.fn() };
});

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

const base: PlaylistWithCounts = {
  id: 'playlist-rest',
  ownerAccountId: 'account-1',
  name: 'Rest Mix',
  coverTrackId: null,
  coverUpdatedAt: null,
  provider: Provider.Youtube,
  sourcePlaylistId: 'PL-rest',
  syncStatus: PlaylistSyncStatus.Idle,
  lastSyncedAt: '2026-09-29T12:00:00.000Z',
  trackCount: 3,
  skipNonMusic: true,
  sort: PlaylistSort.Playlist,
  access: 'owner',
  hasShares: false,
  pinned: false,
  counts: {
    stored: 0,
    pending: 1,
    downloading: 0,
    failed: 2,
    unavailable: 0
  },
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z'
};

const pinned: PlaylistWithCounts = {
  ...base,
  id: 'playlist-pinned',
  name: 'Pinned Mix',
  pinned: true
};

const syncing: PlaylistWithCounts = {
  ...base,
  id: 'playlist-syncing',
  name: 'Syncing Mix',
  syncStatus: PlaylistSyncStatus.Syncing
};

const shared: PlaylistWithCounts = {
  ...base,
  id: 'playlist-shared',
  name: 'Shared Mix',
  ownerAccountId: 'account-2',
  access: ShareLevel.Read
};

const directory: AccountSummary[] = [
  { id: 'account-2', displayName: 'Bea', avatarUrl: null }
];

const failure = new ApiError(503, {
  type: 'about:blank',
  title: 'Service unavailable',
  status: 503,
  code: ProblemCode.InternalError,
  detail: 'The library is unavailable.'
});

function page(items: readonly PlaylistWithCounts[]): PlaylistPage {
  return { items: [...items], total: items.length, limit: 50, offset: 0 };
}

function queryResult<T>(data: T, overrides: Record<string, unknown> = {}) {
  return {
    data,
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
    ...overrides
  } as never;
}

async function renderPlaylists(
  result: unknown,
  accounts: AccountSummary[] = []
) {
  jest.mocked(usePlaylists).mockReturnValue(result as never);
  jest.mocked(useAccountDirectory).mockReturnValue(queryResult(accounts));

  const onOpenPlaylist = jest.fn();
  const onAddPlaylist = jest.fn();

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nProvider initialLanguage={Language.English} storage={store}>
        <PlaylistGallery
          config={config}
          onOpenPlaylist={onOpenPlaylist}
          onAddPlaylist={onAddPlaylist}
        />
      </I18nProvider>
    </SafeAreaProvider>
  );

  return { onOpenPlaylist, onAddPlaylist };
}

async function renderGallery(
  items: readonly PlaylistWithCounts[],
  accounts: AccountSummary[] = []
) {
  return renderPlaylists(queryResult(page(items)), accounts);
}

describe('the gallery', () => {
  it('draws the pinned, syncing and rest groups in that order', async () => {
    await renderGallery([pinned, syncing, base]);

    expect(screen.getByRole('header', { name: 'Pinned' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Syncing' })).toBeOnTheScreen();

    expect(
      screen
        .getAllByTestId('playlist-card')
        .map(card => card.props.accessibilityLabel)
    ).toEqual(['Pinned Mix', 'Syncing Mix', 'Rest Mix']);
  });

  it('draws no heading for a group with no items', async () => {
    await renderGallery([base]);

    expect(
      screen.queryByRole('header', { name: 'Pinned' })
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('header', { name: 'Syncing' })
    ).not.toBeOnTheScreen();
    expect(screen.getAllByTestId('playlist-card')).toHaveLength(1);
  });

  it('names the owner of a shared playlist', async () => {
    await renderGallery([shared], directory);

    expect(screen.getByText('Shared by Bea', hidden)).toBeOnTheScreen();
  });

  it('draws the incomplete count', async () => {
    await renderGallery([base]);

    expect(screen.getByText('3', hidden)).toBeOnTheScreen();
  });

  it('opens the playlist a card is pressed for', async () => {
    const { onOpenPlaylist } = await renderGallery([pinned, base]);

    await fireEvent.press(screen.getAllByTestId('playlist-card')[0]!);

    expect(onOpenPlaylist).toHaveBeenCalledWith('playlist-pinned');
  });

  it('draws the skeleton while the read is pending', async () => {
    await renderPlaylists(queryResult(undefined, { isPending: true }));

    expect(screen.getByTestId('gallery-skeleton')).toBeOnTheScreen();
    expect(screen.queryByText('No playlists yet')).not.toBeOnTheScreen();
  });

  it('draws the empty gallery and calls the add callback', async () => {
    const { onAddPlaylist } = await renderGallery([]);

    expect(
      screen.getByRole('header', { name: 'No playlists yet' })
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Paste a YouTube playlist link, then sync it. Every stored track is yours from then on, even if the video is taken down later.'
      )
    ).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Add a playlist' })
    );
    expect(onAddPlaylist).toHaveBeenCalledTimes(1);
  });

  it('draws the failure body with the problem and a retry, not the empty gallery', async () => {
    const refetch = jest.fn();
    await renderPlaylists(
      queryResult(undefined, { isError: true, error: failure, refetch })
    );

    expect(screen.getByText('The library is unavailable.')).toBeOnTheScreen();
    expect(screen.queryByText('No playlists yet')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
