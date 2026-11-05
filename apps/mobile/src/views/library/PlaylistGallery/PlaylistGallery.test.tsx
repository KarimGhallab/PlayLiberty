import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react-native';
import { useState } from 'react';
import { Dimensions, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  type AccountSummary,
  type PlaylistPage,
  PlaylistSort,
  PlaylistSyncStatus,
  type PlaylistWithCounts,
  ProblemCode,
  Provider,
  REMOTE_REMOVED,
  ShareLevel,
  TrackFileStatus
} from '@playliberty/contracts';
import type { TrackFilterState } from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import { actionDialSize } from '../../../shared/components/ActionDial/ActionDial';
import { tokenLength, touchTarget } from '../../../shared/styles/tokens';

import { ApiError } from '../../../api/apiClient/ApiClient';
import { createAppQueryClient } from '../../../api/queryClient/queryClient';
import { useAccount } from '../../../api/useAccount';
import { useAccountDirectory } from '../../../api/useAccountDirectory';
import { useAccountPage } from '../../../api/useAccountPage/useAccountPage';
import { useCreatePlaylist } from '../../../api/useCreatePlaylist/useCreatePlaylist';
import { useDeletePlaylist } from '../../../api/useDeletePlaylist';
import { useGrantShare } from '../../../api/useGrantShare';
import { usePlaylistShares } from '../../../api/usePlaylistShares';
import { usePlaylists } from '../../../api/usePlaylists/usePlaylists';
import { useRemovePlaylistCover } from '../../../api/useRemovePlaylistCover';
import { useRenamePlaylist } from '../../../api/useRenamePlaylist';
import { useRevokeShare } from '../../../api/useRevokeShare';
import { useSetPlaylistCover } from '../../../api/useSetPlaylistCover';
import { useSyncAllPlaylists } from '../../../api/useSyncAllPlaylists/useSyncAllPlaylists';
import { useSyncPlaylist } from '../../../api/useSyncPlaylist';
import { useUpdatePin } from '../../../api/useUpdatePin';
import { useUpdateSkipNonMusic } from '../../../api/useUpdateSkipNonMusic/useUpdateSkipNonMusic';
import type { ApiConfig } from '../../../auth/useApiConfig';
import { playerBarHeight } from '../../../player/playerBarSize/playerBarSize';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import { startPlaylistPlayback } from '../../../player/startPlaylistPlayback/startPlaylistPlayback';
import type { LibraryScope } from '../GalleryFilterBar/GalleryFilterBar';
import {
  galleryColumnCount,
  galleryColumnWidth,
  galleryPinnedWidth
} from '../galleryColumns/galleryColumns';
import PlaylistGallery from './PlaylistGallery';

jest.mock('../../../api/usePlaylists/usePlaylists', () => ({
  usePlaylists: jest.fn()
}));

jest.mock('../../../api/useCreatePlaylist/useCreatePlaylist', () => ({
  useCreatePlaylist: jest.fn()
}));

jest.mock('../../../api/useUpdatePin', () => ({
  useUpdatePin: jest.fn()
}));

jest.mock('../../../api/useUpdateSkipNonMusic/useUpdateSkipNonMusic', () => ({
  useUpdateSkipNonMusic: jest.fn()
}));

jest.mock('../../../api/useSyncPlaylist', () => ({
  useSyncPlaylist: jest.fn()
}));

jest.mock('../../../api/useSyncAllPlaylists/useSyncAllPlaylists', () => ({
  useSyncAllPlaylists: jest.fn()
}));

jest.mock('../../../api/useDeletePlaylist', () => ({
  useDeletePlaylist: jest.fn()
}));

jest.mock('../../../api/useRenamePlaylist', () => ({
  useRenamePlaylist: jest.fn()
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

jest.mock(
  '../../../player/startPlaylistPlayback/startPlaylistPlayback',
  () => ({
    readPlayableQueue: jest.fn(),
    startPlaylistPlayback: jest.fn(async () => null)
  })
);

jest.mock('expo-file-system', () => ({
  File: class {
    readonly uri: string;
    readonly size = 0;

    constructor(uri: string) {
      this.uri = uri;
    }
  }
}));

jest.mock('../../../api/useAccountDirectory', () => {
  const actual = jest.requireActual<
    typeof import('../../../api/useAccountDirectory')
  >('../../../api/useAccountDirectory');

  return { ...actual, useAccountDirectory: jest.fn() };
});

const store = { getItem: () => null, setItem: () => {} };
const hidden = { includeHiddenElements: true };

/* A card is one accessibility target, so its controls are reached from it. */
function cardOf(name: string) {
  return screen.getByLabelText(new RegExp(`^${name}, `));
}

function controlOf(control: string, name: string) {
  return within(cardOf(name)).getByTestId(
    control === 'actions' ? /^playlist-actions/ : `playlist-${control}`,
    hidden
  );
}

afterEach(() => {
  usePlayerStore.getState().clear();
  jest.mocked(startPlaylistPlayback).mockClear();
});

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
  remoteRemoved: 0,
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

const storedItem: PlaylistWithCounts = {
  ...base,
  id: 'playlist-stored',
  name: 'Stored Mix',
  counts: {
    stored: 3,
    pending: 0,
    downloading: 0,
    failed: 0,
    unavailable: 0
  }
};

const retainedItem: PlaylistWithCounts = {
  ...base,
  id: 'playlist-retained',
  name: 'Retained Mix',
  counts: {
    stored: 2,
    pending: 0,
    downloading: 0,
    failed: 0,
    unavailable: 0
  },
  remoteRemoved: 2
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
    isRefetching: false,
    dataUpdatedAt: 0,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
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
  };
}

function hasErrorHandler(value: unknown): value is { onError?: () => void } {
  return typeof value === 'object' && value !== null;
}

function hasSuccessHandler(
  value: unknown
): value is { onSuccess?: () => void } {
  return typeof value === 'object' && value !== null;
}

function GalleryHarness({
  onOpenPlaylist,
  initialStatus = null
}: {
  readonly onOpenPlaylist: (playlistId: string) => void;
  readonly initialStatus?: TrackFilterState | null;
}) {
  const [scope, setScope] = useState<LibraryScope>('all');
  const [statusFilter, setStatusFilter] = useState<TrackFilterState | null>(
    initialStatus
  );

  return (
    <PlaylistGallery
      config={config}
      scope={scope}
      statusFilter={statusFilter}
      onScopeChange={setScope}
      onStatusChange={setStatusFilter}
      onOpenPlaylist={onOpenPlaylist}
    />
  );
}

async function renderPlaylists(
  result: unknown,
  accounts: AccountSummary[] = [],
  syncAllResult: ReturnType<typeof mutationResult> = mutationResult(),
  initialStatus: TrackFilterState | null = null
) {
  jest.mocked(usePlaylists).mockReturnValue(result as never);
  jest.mocked(useAccountDirectory).mockReturnValue(queryResult(accounts));
  jest.mocked(useCreatePlaylist).mockReturnValue(mutationResult() as never);
  const pin = mutationResult();
  const syncNow = mutationResult();
  const syncAll = syncAllResult;
  const remove = mutationResult();
  const rename = mutationResult();
  const skipSetting = mutationResult();
  jest.mocked(useUpdatePin).mockReturnValue(pin as never);
  jest.mocked(useSyncPlaylist).mockReturnValue(syncNow as never);
  jest.mocked(useSyncAllPlaylists).mockReturnValue(syncAll as never);
  jest.mocked(useDeletePlaylist).mockReturnValue(remove as never);
  jest.mocked(useRenamePlaylist).mockReturnValue(rename as never);
  jest.mocked(useUpdateSkipNonMusic).mockReturnValue(skipSetting as never);
  jest.mocked(usePlaylistShares).mockReturnValue(queryResult([]));
  jest.mocked(useRevokeShare).mockReturnValue(mutationResult() as never);
  jest.mocked(useAccount).mockReturnValue(
    queryResult({
      id: 'account-me',
      displayName: 'Owner',
      email: null,
      avatarUrl: null,
      role: 'user'
    }) as never
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
  jest.mocked(useGrantShare).mockReturnValue(mutationResult() as never);
  jest.mocked(useSetPlaylistCover).mockReturnValue(mutationResult() as never);
  jest
    .mocked(useRemovePlaylistCover)
    .mockReturnValue(mutationResult() as never);

  const onOpenPlaylist = jest.fn();
  const client = createAppQueryClient(() => {});

  const view = await render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={metrics}>
        <I18nProvider initialLanguage={Language.English} storage={store}>
          <GalleryHarness
            onOpenPlaylist={onOpenPlaylist}
            initialStatus={initialStatus}
          />
        </I18nProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );

  return {
    onOpenPlaylist,
    view,
    pin,
    syncNow,
    syncAll,
    remove,
    rename,
    skipSetting
  };
}

async function renderGallery(
  items: readonly PlaylistWithCounts[],
  accounts: AccountSummary[] = [],
  syncAllResult?: ReturnType<typeof mutationResult>
) {
  return renderPlaylists(
    queryResult(page(items)),
    accounts,
    syncAllResult ?? mutationResult()
  );
}

describe('the gallery', () => {
  it('draws the pinned, syncing and rest groups in that order', async () => {
    await renderGallery([pinned, syncing, base]);

    expect(screen.getByRole('header', { name: 'Pinned' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Syncing' })).toBeOnTheScreen();

    expect(
      screen
        .getAllByTestId('playlist-card')
        .map(card => String(card.props.accessibilityLabel).split(',')[0])
    ).toEqual(['Pinned Mix', 'Syncing Mix', 'Rest Mix']);
  });

  it('draws the pinned group as one horizontal row', async () => {
    await renderGallery([pinned, base]);

    expect(screen.getByTestId('pinned-row').props.horizontal).toBe(true);
  });

  it('mounts only the pinned cards the viewport needs', async () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      ...pinned,
      id: `pinned-${index}`,
      name: `Pinned ${index}`
    }));
    await renderGallery([...many, base]);

    const windowWidth = Dimensions.get('window').width;
    const columnWidth = galleryColumnWidth(windowWidth);
    const columns = galleryColumnCount(windowWidth);
    const gap = tokenLength('space-3');
    const viewport = columns * columnWidth + (columns - 1) * gap;
    const bound = Math.max(
      2,
      Math.ceil(viewport / (galleryPinnedWidth(windowWidth) + gap))
    );
    const drawn = screen.getAllByTestId('pinned-card').length;

    expect(drawn).toBeLessThanOrEqual(bound);
    expect(drawn).toBeLessThan(many.length);
  });

  it('draws no pinned row when nothing is pinned', async () => {
    await renderGallery([base]);

    expect(screen.queryByTestId('pinned-row')).not.toBeOnTheScreen();
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

  it('draws the incomplete count with its word', async () => {
    await renderGallery([base]);

    expect(
      within(screen.getByTestId('playlist-incomplete', hidden)).getByText(
        '3 tracks are not stored',
        hidden
      )
    ).toBeOnTheScreen();
  });

  it('opens the playlist a card is pressed for', async () => {
    const { onOpenPlaylist } = await renderGallery([pinned, base]);

    await fireEvent.press(screen.getAllByTestId('playlist-card')[0]!);

    expect(onOpenPlaylist).toHaveBeenCalledWith('playlist-pinned');
  });

  it('opens the owner actions sheet from a card', async () => {
    await renderGallery([base]);

    await fireEvent.press(controlOf('actions', 'Rest Mix'));

    await waitFor(() => {
      expect(screen.getByTestId('playlist-actions-sheet')).toBeOnTheScreen();
    });

    for (const key of ['pin', 'share', 'rename', 'cover', 'sync', 'delete']) {
      expect(screen.getByTestId(`playlist-action-${key}`)).toBeOnTheScreen();
    }
    expect(
      within(screen.getByTestId('playlist-action-delete')).getByText('Delete')
    ).toBeOnTheScreen();
  });

  it('carries the skip setting in a card actions sheet', async () => {
    const { skipSetting } = await renderPlaylists(queryResult(page([base])));

    await fireEvent.press(controlOf('actions', 'Rest Mix'));

    await waitFor(() => {
      expect(screen.getByTestId('playlist-actions-sheet')).toBeOnTheScreen();
    });

    const skip = screen.getByRole('checkbox', {
      name: 'Skip non-music parts'
    });

    expect(skip).toBeChecked();

    await fireEvent.press(skip);

    expect(skipSetting.mutate).toHaveBeenCalledWith(false, expect.anything());
  });

  it('keeps the skip setting disabled for a read-only share', async () => {
    await renderPlaylists(queryResult(page([shared])));

    await fireEvent.press(controlOf('actions', 'Shared Mix'));

    await waitFor(() => {
      expect(screen.getByTestId('playlist-actions-sheet')).toBeOnTheScreen();
    });

    expect(
      screen.getByRole('checkbox', { name: 'Skip non-music parts' })
    ).toBeDisabled();
  });

  it('starts a shuffled playlist from its card', async () => {
    await renderGallery([storedItem]);

    await fireEvent.press(controlOf('shuffle', 'Stored Mix'));

    await waitFor(() => {
      expect(startPlaylistPlayback).toHaveBeenCalledWith(
        storedItem,
        'shuffle',
        expect.any(Function)
      );
    });
  });

  it('starts a playlist from its card', async () => {
    await renderGallery([storedItem]);

    await fireEvent.press(controlOf('play', 'Stored Mix'));

    await waitFor(() => {
      expect(startPlaylistPlayback).toHaveBeenCalledWith(
        storedItem,
        'play',
        expect.any(Function)
      );
    });
  });

  it('pauses the queue a card already owns', async () => {
    usePlayerStore.getState().start(
      [
        {
          id: 'track-1',
          title: 'First Song',
          durationSeconds: 182,
          thumbnailPath: null
        }
      ],
      { id: 'playlist-stored', name: 'Stored Mix' },
      'track-1'
    );
    await renderGallery([storedItem]);

    await fireEvent.press(controlOf('play', 'Stored Mix'));

    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(startPlaylistPlayback).not.toHaveBeenCalled();
  });

  it('explains a refused shuffle on the card', async () => {
    jest.mocked(startPlaylistPlayback).mockResolvedValueOnce({ kind: 'empty' });
    await renderGallery([storedItem]);

    await fireEvent.press(controlOf('shuffle', 'Stored Mix'));

    await waitFor(() => {
      expect(
        screen.getByText('Nothing to play in “Stored Mix”.')
      ).toBeOnTheScreen();
    });
  });

  it('offers a reader the pin alone', async () => {
    await renderGallery([shared], directory);

    await fireEvent.press(controlOf('actions', 'Shared Mix'));

    await waitFor(() => {
      expect(screen.getByTestId('playlist-action-pin')).toBeOnTheScreen();
    });
    expect(screen.queryByTestId('playlist-action-share')).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId('playlist-action-rename')
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId('playlist-action-delete')
    ).not.toBeOnTheScreen();
  });

  it('reads Unpin on a pinned card', async () => {
    await renderGallery([pinned]);

    await fireEvent.press(controlOf('actions', 'Pinned Mix'));

    await waitFor(() => {
      expect(
        within(screen.getByTestId('playlist-action-pin')).getByText('Unpin')
      ).toBeOnTheScreen();
    });
  });

  it('offers a write collaborator the pin, Cover and Sync', async () => {
    await renderGallery([{ ...base, access: ShareLevel.Write }]);

    await fireEvent.press(controlOf('actions', 'Rest Mix'));

    await waitFor(() => {
      expect(screen.getByTestId('playlist-action-pin')).toBeOnTheScreen();
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
  });

  it('pins from the sheet and keeps a refusal in the sheet', async () => {
    const { pin } = await renderGallery([base]);
    pin.mutate.mockImplementation((...args: unknown[]) => {
      const options = args[1];

      if (hasErrorHandler(options)) {
        options.onError?.();
      }
    });

    await fireEvent.press(controlOf('actions', 'Rest Mix'));
    await waitFor(() => {
      expect(screen.getByTestId('playlist-action-pin')).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByTestId('playlist-action-pin'));

    expect(pin.mutate).toHaveBeenCalledWith(
      { playlistId: 'playlist-rest', pinned: true },
      expect.anything()
    );
    await waitFor(() => {
      expect(screen.getByTestId('playlist-actions-problem')).toHaveTextContent(
        'The pin could not be changed.'
      );
    });
    expect(screen.getByTestId('playlist-actions-sheet')).toBeOnTheScreen();
  });

  it('syncs from the sheet and closes it on success', async () => {
    const { syncNow } = await renderGallery([base]);
    syncNow.mutate.mockImplementation((...args: unknown[]) => {
      const options = args[1];

      if (hasSuccessHandler(options)) {
        options.onSuccess?.();
      }
    });

    await fireEvent.press(controlOf('actions', 'Rest Mix'));
    await waitFor(() => {
      expect(screen.getByTestId('playlist-action-sync')).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByTestId('playlist-action-sync'));

    expect(syncNow.mutate).toHaveBeenCalledWith(
      'playlist-rest',
      expect.anything()
    );
    await waitFor(() => {
      expect(
        screen.queryByTestId('playlist-actions-sheet')
      ).not.toBeOnTheScreen();
    });
  });

  it('keeps a refused sync in the sheet', async () => {
    const { syncNow } = await renderGallery([base]);
    syncNow.mutate.mockImplementation((...args: unknown[]) => {
      const options = args[1];

      if (hasErrorHandler(options)) {
        options.onError?.();
      }
    });

    await fireEvent.press(controlOf('actions', 'Rest Mix'));
    await waitFor(() => {
      expect(screen.getByTestId('playlist-action-sync')).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByTestId('playlist-action-sync'));

    await waitFor(() => {
      expect(screen.getByTestId('playlist-actions-problem')).toHaveTextContent(
        'The sync could not be started.'
      );
    });
    expect(screen.getByTestId('playlist-actions-sheet')).toBeOnTheScreen();
  });

  it('removes a card on delete and restores it on Undo without sending', async () => {
    const { remove } = await renderGallery([base]);

    await fireEvent.press(controlOf('actions', 'Rest Mix'));
    await waitFor(() => {
      expect(screen.getByTestId('playlist-action-delete')).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByTestId('playlist-action-delete'));

    await waitFor(() => {
      expect(
        screen.queryByTestId('playlist-actions-sheet')
      ).not.toBeOnTheScreen();
    });
    await waitFor(() => {
      expect(screen.queryByTestId('playlist-card')).not.toBeOnTheScreen();
    });
    expect(screen.getByTestId('undo-snackbar')).toBeOnTheScreen();
    expect(remove.mutate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('undo-snackbar-action'));

    await waitFor(() => {
      expect(screen.getByTestId('playlist-card')).toBeOnTheScreen();
    });
    expect(remove.mutate).not.toHaveBeenCalled();
  });

  it('renames a playlist from its card', async () => {
    const { rename } = await renderGallery([base]);

    await fireEvent.press(controlOf('actions', 'Rest Mix'));
    await waitFor(() => {
      expect(screen.getByTestId('playlist-action-rename')).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByTestId('playlist-action-rename'));

    await waitFor(() => {
      expect(screen.getByTestId('rename-sheet')).toBeOnTheScreen();
    });
    expect(screen.getByLabelText('Playlist name')).toHaveDisplayValue(
      'Rest Mix'
    );

    rename.mutate.mockImplementation((...args: unknown[]) => {
      const options = args[1];

      if (hasSuccessHandler(options)) {
        options.onSuccess?.();
      }
    });

    await fireEvent.changeText(
      screen.getByLabelText('Playlist name'),
      '  New Name  '
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Playlist name')).toHaveDisplayValue(
        '  New Name  '
      );
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(rename.mutate).toHaveBeenCalledWith(
      { playlistId: 'playlist-rest', name: 'New Name' },
      expect.anything()
    );
    await waitFor(() => {
      expect(screen.queryByTestId('rename-sheet')).not.toBeOnTheScreen();
    });
  });

  it('keeps a refused rename in the sheet', async () => {
    const { rename } = await renderGallery([base]);
    rename.mutate.mockImplementation((...args: unknown[]) => {
      const options = args[1];

      if (hasErrorHandler(options)) {
        options.onError?.();
      }
    });

    await fireEvent.press(controlOf('actions', 'Rest Mix'));
    await waitFor(() => {
      expect(screen.getByTestId('playlist-action-rename')).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByTestId('playlist-action-rename'));
    await waitFor(() => {
      expect(screen.getByTestId('rename-sheet')).toBeOnTheScreen();
    });

    await fireEvent.changeText(
      screen.getByLabelText('Playlist name'),
      'New Name'
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Playlist name')).toHaveDisplayValue(
        'New Name'
      );
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The playlist could not be renamed.'
      );
    });
    expect(screen.getByTestId('rename-sheet')).toBeOnTheScreen();
  });

  it('opens the share sheet from a card', async () => {
    await renderGallery([base]);

    await fireEvent.press(controlOf('actions', 'Rest Mix'));
    await waitFor(() => {
      expect(screen.getByTestId('playlist-action-share')).toBeOnTheScreen();
    });
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

  it('opens the cover sheet from a card', async () => {
    await renderGallery([base]);

    await fireEvent.press(controlOf('actions', 'Rest Mix'));
    await waitFor(() => {
      expect(screen.getByTestId('playlist-action-cover')).toBeOnTheScreen();
    });
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

  it('refetches the gallery and its counts on pull', async () => {
    const refetch = jest.fn();
    await renderPlaylists(queryResult(page([base]), { refetch }));

    const control = screen.getByTestId('gallery-scroll').props.refreshControl;
    control.props.onRefresh();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('appends the next page when the last row is near', async () => {
    const fetchNextPage = jest.fn();
    await renderPlaylists(
      queryResult(page([base]), { hasNextPage: true, fetchNextPage })
    );

    await fireEvent.scroll(screen.getByTestId('gallery-scroll'), {
      nativeEvent: {
        contentOffset: { x: 0, y: 800 },
        contentSize: { width: 390, height: 1200 },
        layoutMeasurement: { width: 390, height: 600 }
      }
    });

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('waits for the last row before appending', async () => {
    const fetchNextPage = jest.fn();
    await renderPlaylists(
      queryResult(page([base]), { hasNextPage: true, fetchNextPage })
    );

    await fireEvent.scroll(screen.getByTestId('gallery-scroll'), {
      nativeEvent: {
        contentOffset: { x: 0, y: 0 },
        contentSize: { width: 390, height: 2000 },
        layoutMeasurement: { width: 390, height: 600 }
      }
    });

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('draws the scope and the chips with their counts', async () => {
    await renderGallery([shared, base], directory);

    expect(screen.getByRole('radio', { name: 'All 2' })).toBeChecked();
    expect(screen.getByTestId('scope-all').props.hitSlop).toEqual({
      top: 3,
      bottom: 3
    });
    expect(
      screen.getByRole('radio', { name: 'Shared with me 1' })
    ).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'All tracks 6' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Pending 2' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Failed 4' })).toBeOnTheScreen();
    expect(
      screen.queryByRole('radio', { name: /Stored/ })
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('radio', { name: /Downloading/ })
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('radio', { name: /Unavailable/ })
    ).not.toBeOnTheScreen();
  });

  it('hides the scope pair when nothing is shared', async () => {
    await renderGallery([base]);

    expect(
      screen.queryByRole('radio', { name: 'Shared with me 1' })
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('radio', { name: 'All 1' })
    ).not.toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'All 3' })).toBeOnTheScreen();
  });

  it('filters the grid to the shared scope', async () => {
    await renderGallery([shared, base], directory);

    await fireEvent.press(
      screen.getByRole('radio', { name: 'Shared with me 1' })
    );

    expect(screen.getAllByTestId('playlist-card')).toHaveLength(1);
    expect(
      screen.getByTestId('playlist-card').props.accessibilityLabel
    ).toMatch(/^Shared Mix, /);
    expect(
      screen.getByRole('radio', { name: 'All tracks 3' })
    ).toBeOnTheScreen();
  });

  it('filters the grid by a status chip', async () => {
    await renderGallery([storedItem, base]);

    await fireEvent.press(screen.getByRole('radio', { name: 'Failed 2' }));

    expect(screen.getAllByTestId('playlist-card')).toHaveLength(1);
    expect(
      screen.getByTestId('playlist-card').props.accessibilityLabel
    ).toMatch(/^Rest Mix, /);
  });

  it('draws the retained chip last and filters to the playlists holding one', async () => {
    await renderGallery([retainedItem, storedItem, base]);

    const chips = within(
      screen.getByTestId('gallery-status-chips')
    ).getAllByRole('radio');

    expect(chips.at(-1)?.props.accessibilityLabel).toBe(
      'Removed from YouTube 2'
    );

    await fireEvent.press(
      screen.getByRole('radio', { name: 'Removed from YouTube 2' })
    );

    expect(screen.getAllByTestId('playlist-card')).toHaveLength(1);
    expect(
      screen.getByTestId('playlist-card').props.accessibilityLabel
    ).toMatch(/^Retained Mix, /);
  });

  it('hides the retained chip when no playlist holds one', async () => {
    await renderGallery([storedItem, base]);

    expect(
      screen.queryByRole('radio', { name: /Removed from/ })
    ).not.toBeOnTheScreen();
  });

  it('aggregates the retained view over the scope', async () => {
    const sharedRetained: PlaylistWithCounts = {
      ...shared,
      counts: { ...shared.counts, stored: 1 },
      remoteRemoved: 1
    };

    await renderGallery([sharedRetained, retainedItem, base], directory);

    expect(
      screen.getByRole('radio', { name: 'Removed from YouTube 3' })
    ).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('radio', { name: 'Shared with me 1' })
    );
    await fireEvent.press(
      screen.getByRole('radio', { name: 'Removed from YouTube 1' })
    );

    expect(screen.getAllByTestId('playlist-card')).toHaveLength(1);
    expect(
      screen.getByTestId('playlist-card').props.accessibilityLabel
    ).toMatch(/^Shared Mix, /);
  });

  it('clears the retained filter when its count reaches zero', async () => {
    await renderPlaylists(
      queryResult(page([base])),
      [],
      undefined,
      REMOTE_REMOVED
    );

    expect(screen.getByRole('radio', { name: 'All 3' })).toBeChecked();
    expect(
      screen.queryByRole('radio', { name: /Removed from/ })
    ).not.toBeOnTheScreen();
  });

  it('clears the scope and the chip when the screen is left', async () => {
    const { view } = await renderGallery([shared, base], directory);

    await fireEvent.press(
      screen.getByRole('radio', { name: 'Shared with me 1' })
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Failed 2' }));

    await view.unmount();
    await renderGallery([shared, base], directory);

    expect(screen.getByRole('radio', { name: 'All 2' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'All tracks 6' })).toBeChecked();
  });

  it('scrolls the filter row horizontally', async () => {
    await renderGallery([shared, base], directory);

    expect(screen.getByTestId('gallery-filter-bar').props.horizontal).toBe(
      true
    );
  });

  it('leaves the rail at its start until a chip is chosen', async () => {
    const scrollTo = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => {});
    await renderGallery([shared, base], directory);

    await act(async () => {
      screen.getByTestId('gallery-filter-bar').props.onLayout({
        nativeEvent: { layout: { width: 200 } }
      });
      screen.getByTestId('gallery-status-chips').props.onLayout({
        nativeEvent: { layout: { x: 150, width: 300 } }
      });
      screen.getByTestId('gallery-chip-all').props.onLayout({
        nativeEvent: { layout: { x: 0, width: 120 } }
      });
      screen.getByTestId('gallery-chip-failed').props.onLayout({
        nativeEvent: { layout: { x: 226, width: 90 } }
      });
    });

    expect(scrollTo).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('radio', { name: 'Failed 4' }));

    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ x: 150 + 226 + 90 - 200 + 12 })
    );

    scrollTo.mockRestore();
  });

  it('reveals a restored status chip without animating', async () => {
    const scrollTo = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => {});
    await renderPlaylists(
      queryResult(page([shared, base])),
      directory,
      undefined,
      TrackFileStatus.Failed
    );

    await act(async () => {
      screen.getByTestId('gallery-filter-bar').props.onLayout({
        nativeEvent: { layout: { width: 200 } }
      });
      screen.getByTestId('gallery-status-chips').props.onLayout({
        nativeEvent: { layout: { x: 150, width: 300 } }
      });
      screen.getByTestId('gallery-chip-failed').props.onLayout({
        nativeEvent: { layout: { x: 226, width: 90 } }
      });
    });

    expect(scrollTo).toHaveBeenCalledWith({
      x: 150 + 226 + 90 - 200 + 12,
      animated: false
    });

    scrollTo.mockRestore();
  });

  it('reveals a restored chip at a capped text scale', async () => {
    const scrollTo = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => {});
    await renderPlaylists(
      queryResult(page([shared, base])),
      directory,
      undefined,
      TrackFileStatus.Failed
    );

    await act(async () => {
      screen.getByTestId('gallery-filter-bar').props.onLayout({
        nativeEvent: { layout: { width: 200 } }
      });
      screen.getByTestId('gallery-status-chips').props.onLayout({
        nativeEvent: { layout: { x: 150, width: 300 } }
      });
      screen.getByTestId('gallery-chip-failed').props.onLayout({
        nativeEvent: { layout: { x: 260, width: 117 } }
      });
    });

    expect(scrollTo).toHaveBeenCalledWith({
      x: 150 + 260 + 117 - 200 + 12,
      animated: false
    });

    scrollTo.mockRestore();
  });

  it('mounts a bounded number of cards for a large library', async () => {
    const many = Array.from({ length: 200 }, (_, index) => ({
      ...base,
      id: `playlist-${index}`,
      name: `Playlist ${index}`
    }));

    await renderGallery(many);

    expect(screen.getAllByTestId('playlist-card').length).toBeLessThan(200);
  });

  it('draws the skeleton while the read is pending', async () => {
    await renderPlaylists(queryResult(undefined, { isPending: true }));

    expect(screen.getByTestId('gallery-skeleton')).toBeOnTheScreen();
    expect(
      screen.getByTestId('gallery-skeleton-rail', {
        includeHiddenElements: true
      })
    ).toHaveStyle({ height: touchTarget });
    expect(screen.queryByText('No playlists yet')).not.toBeOnTheScreen();
  });

  it('draws the empty gallery and opens the add sheet from its action', async () => {
    await renderGallery([]);

    expect(
      screen.getByRole('header', { name: 'No playlists yet' })
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Paste a YouTube playlist link, then sync it to listen to its tracks.'
      )
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('gallery-add')).not.toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Add a playlist' })
    );

    await waitFor(() => {
      expect(screen.getByTestId('add-sheet')).toBeOnTheScreen();
    });
  });

  it('opens the add sheet from the gallery dial', async () => {
    await renderGallery([base]);

    await fireEvent.press(screen.getByTestId('gallery-actions'));
    await fireEvent.press(screen.getByTestId('gallery-add'));

    await waitFor(() => {
      expect(screen.getByTestId('add-sheet')).toBeOnTheScreen();
    });
  });

  it('starts the bulk sync of the writable playlists from the dial', async () => {
    const { syncAll } = await renderGallery([base, shared]);

    await fireEvent.press(screen.getByTestId('gallery-actions'));
    await fireEvent.press(screen.getByTestId('gallery-sync'));

    expect(syncAll.mutate).toHaveBeenCalledWith(
      ['playlist-rest'],
      expect.anything()
    );
  });

  it('holds the sync row while the batch runs', async () => {
    await renderGallery([base], [], mutationResult({ isPending: true }));

    await fireEvent.press(screen.getByTestId('gallery-actions'));
    await fireEvent.press(screen.getByTestId('gallery-sync'));

    await waitFor(() => {
      expect(screen.getByTestId('gallery-sync', hidden)).toBeDisabled();
    });
  });

  it('keeps the add trigger live while one playlist syncs', async () => {
    await renderGallery([syncing]);

    expect(screen.getByTestId('gallery-actions')).toBeEnabled();

    await fireEvent.press(screen.getByTestId('gallery-actions'));
    await fireEvent.press(screen.getByTestId('gallery-add'));

    await waitFor(() => {
      expect(screen.getByTestId('add-sheet')).toBeOnTheScreen();
    });
  });

  it('holds the dial while the bulk sync runs', async () => {
    await renderGallery([base]);

    await fireEvent.press(screen.getByTestId('gallery-actions'));
    await fireEvent.press(screen.getByTestId('gallery-sync'));

    await waitFor(() => {
      expect(screen.getByTestId('gallery-actions')).toBeDisabled();
    });
  });

  it('clears the player bar under the last row and the dial', async () => {
    usePlayerStore.getState().start(
      [
        {
          id: 'track-1',
          title: 'First Song',
          durationSeconds: 182,
          thumbnailPath: null
        }
      ],
      { id: 'playlist-1', name: 'Rest Mix' },
      'track-1'
    );
    await renderGallery([base]);

    expect(
      screen.getByTestId('gallery-scroll').props.contentContainerStyle[1]
        .paddingBottom
    ).toBe(
      tokenLength('space-4') +
        actionDialSize +
        tokenLength('space-3') +
        playerBarHeight
    );
    expect(screen.getByTestId('gallery-actions-dial')).toHaveStyle({
      bottom: tokenLength('space-4') + playerBarHeight
    });
  });

  it('closes the add sheet when the create succeeds', async () => {
    jest.mocked(usePlaylists).mockReturnValue(queryResult(page([base])));
    jest.mocked(useAccountDirectory).mockReturnValue(queryResult([]));
    const create = mutationResult();
    jest.mocked(useCreatePlaylist).mockReturnValue(create as never);
    const onOpenPlaylist = jest.fn();
    const client = createAppQueryClient(() => {});

    const tree = () => (
      <QueryClientProvider client={client}>
        <SafeAreaProvider initialMetrics={metrics}>
          <I18nProvider initialLanguage={Language.English} storage={store}>
            <GalleryHarness onOpenPlaylist={onOpenPlaylist} />
          </I18nProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    );

    const view = await render(tree());
    await fireEvent.press(screen.getByTestId('gallery-actions'));
    await fireEvent.press(screen.getByTestId('gallery-add'));
    await waitFor(() => {
      expect(screen.getByTestId('add-sheet')).toBeOnTheScreen();
    });

    const succeeded = mutationResult({ isSuccess: true });
    jest.mocked(useCreatePlaylist).mockReturnValue(succeeded as never);
    await view.rerender(tree());

    await waitFor(() => {
      expect(screen.queryByTestId('add-sheet')).not.toBeOnTheScreen();
    });
    expect(succeeded.reset).toHaveBeenCalled();
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
