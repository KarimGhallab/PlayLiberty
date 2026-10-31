import { describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Playlist } from '@playliberty/contracts';
import {
  PlaylistSort,
  PlaylistSyncStatus,
  Provider
} from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import { useRemovePlaylistCover } from '../../../api/useRemovePlaylistCover';
import { useSetPlaylistCover } from '../../../api/useSetPlaylistCover';
import CoverSheet, { type CoverSheetProps } from './CoverSheet';

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

jest.setTimeout(15000);

const store = { getItem: () => null, setItem: () => {} };

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

const playlist: Playlist = {
  id: 'playlist-1',
  ownerAccountId: 'account-1',
  name: 'Paradis',
  coverTrackId: null,
  coverUpdatedAt: null,
  provider: Provider.Youtube,
  sourcePlaylistId: 'PL-demo',
  syncStatus: PlaylistSyncStatus.Idle,
  lastSyncedAt: null,
  trackCount: 12,
  skipNonMusic: true,
  sort: PlaylistSort.Playlist,
  access: 'owner',
  hasShares: false,
  pinned: false,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z'
};

const customCover: Playlist = {
  ...playlist,
  coverUpdatedAt: '2026-10-01T00:00:00.000Z'
};

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

let setCover = mutationResult();
let removeCover = mutationResult();

const launchLibrary = jest.mocked(ImagePicker.launchImageLibraryAsync);
const requestPermission = jest.mocked(
  ImagePicker.requestMediaLibraryPermissionsAsync
);

function sheetElement(props: CoverSheetProps) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nProvider initialLanguage={Language.English} storage={store}>
        <CoverSheet {...props} />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

async function renderSheet(
  overrides: Partial<CoverSheetProps> = {},
  reads: {
    readonly setPending?: boolean;
    readonly removePending?: boolean;
  } = {}
) {
  setCover = mutationResult({ isPending: reads.setPending === true });
  removeCover = mutationResult({ isPending: reads.removePending === true });
  jest.mocked(useSetPlaylistCover).mockReturnValue(setCover as never);
  jest.mocked(useRemovePlaylistCover).mockReturnValue(removeCover as never);
  launchLibrary.mockReset();
  requestPermission.mockClear();

  const props: CoverSheetProps = {
    playlist,
    config: null,
    onClose: jest.fn(),
    ...overrides
  };

  await render(sheetElement(props));

  return props;
}

async function choose(asset: Partial<ImagePicker.ImagePickerAsset>) {
  launchLibrary.mockResolvedValueOnce({
    canceled: false,
    assets: [
      {
        uri: 'file:///tmp/cover.jpg',
        width: 800,
        height: 800,
        mimeType: 'image/jpeg',
        fileSize: 1024,
        ...asset
      } as ImagePicker.ImagePickerAsset
    ]
  });

  fireEvent.press(screen.getByTestId('cover-choose'));

  await waitFor(() => {
    expect(launchLibrary).toHaveBeenCalled();
  });
}

const saveButton = () => screen.getByTestId('cover-save');

describe('the cover sheet', () => {
  it('asks for the photo library when it opens', async () => {
    await renderSheet();

    expect(requestPermission).toHaveBeenCalled();
  });

  it('keeps Save disabled until an image is chosen', async () => {
    await renderSheet();

    expect(saveButton().props.accessibilityState).toMatchObject({
      disabled: true
    });
    fireEvent.press(saveButton());

    expect(setCover.mutate).not.toHaveBeenCalled();
  });

  it('sends the chosen file and its type on Save', async () => {
    await renderSheet();
    await choose({});

    await waitFor(() => {
      expect(screen.getByTestId('cover-preview')).toBeOnTheScreen();
    });
    expect(saveButton().props.accessibilityState).toMatchObject({
      disabled: false
    });

    fireEvent.press(saveButton());

    expect(setCover.mutate).toHaveBeenCalledWith(
      {
        playlistId: 'playlist-1',
        file: expect.objectContaining({ uri: 'file:///tmp/cover.jpg' }),
        contentType: 'image/jpeg'
      },
      expect.anything()
    );
  });

  it('closes on a successful save', async () => {
    const { onClose } = await renderSheet();
    setCover.mutate.mockImplementation((...args: unknown[]) => {
      const options = args[1] as { onSuccess?: () => void } | undefined;

      options?.onSuccess?.();
    });
    await choose({});

    await waitFor(() => {
      expect(screen.getByTestId('cover-preview')).toBeOnTheScreen();
    });
    fireEvent.press(saveButton());

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('refuses a file over 5 MB before a request', async () => {
    await renderSheet();
    await choose({ fileSize: 6 * 1024 * 1024 });

    await waitFor(() => {
      expect(screen.getByTestId('cover-problem')).toHaveTextContent(
        'Choose an image smaller than 5 MB.'
      );
    });
    expect(screen.queryByTestId('cover-preview')).not.toBeOnTheScreen();
    expect(saveButton().props.accessibilityState).toMatchObject({
      disabled: true
    });
    expect(setCover.mutate).not.toHaveBeenCalled();
  });

  it('refuses a type the server cannot store', async () => {
    await renderSheet();
    await choose({ mimeType: 'image/gif' });

    await waitFor(() => {
      expect(screen.getByTestId('cover-problem')).toHaveTextContent(
        'Choose a JPEG, PNG or WebP image.'
      );
    });
    expect(setCover.mutate).not.toHaveBeenCalled();
  });

  it('keeps the image and says so when the save is refused', async () => {
    await renderSheet();
    setCover.mutate.mockImplementation((...args: unknown[]) => {
      const options = args[1] as
        { onError?: (error: Error) => void } | undefined;

      options?.onError?.(new Error('refused'));
    });
    await choose({});

    await waitFor(() => {
      expect(screen.getByTestId('cover-preview')).toBeOnTheScreen();
    });
    fireEvent.press(saveButton());

    await waitFor(() => {
      expect(screen.getByTestId('cover-problem')).toHaveTextContent(
        'The cover could not be saved.'
      );
    });
    expect(screen.getByTestId('cover-preview')).toBeOnTheScreen();
  });

  it('asks once before discarding a chosen image', async () => {
    const { onClose } = await renderSheet();
    await choose({});

    await waitFor(() => {
      expect(screen.getByTestId('cover-preview')).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('cover-cancel'));

    await waitFor(() => {
      expect(screen.getByText(/Discard this image/)).toBeOnTheScreen();
    });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('cover-keep-editing'));
    await waitFor(() => {
      expect(screen.queryByText(/Discard this image/)).not.toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('cover-cancel'));
    await waitFor(() => {
      expect(screen.getByTestId('cover-discard')).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByTestId('cover-discard'));

    expect(onClose).toHaveBeenCalled();
  });

  it('cannot be dismissed while the save is in flight', async () => {
    const { onClose } = await renderSheet({}, { setPending: true });

    fireEvent.press(screen.getByTestId('cover-backdrop'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('offers Remove only for a custom cover and asks once', async () => {
    await renderSheet({ playlist: customCover });
    removeCover.mutate.mockImplementation((...args: unknown[]) => {
      const options = args[1] as { onSuccess?: () => void } | undefined;

      options?.onSuccess?.();
    });

    fireEvent.press(screen.getByTestId('cover-remove'));
    await waitFor(() => {
      expect(screen.getByText(/Remove the custom cover/)).toBeOnTheScreen();
    });
    expect(removeCover.mutate).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('cover-remove-keep'));
    await waitFor(() => {
      expect(
        screen.queryByText(/Remove the custom cover/)
      ).not.toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId('cover-remove'));
    await waitFor(() => {
      expect(screen.getByTestId('cover-remove-confirm')).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByTestId('cover-remove-confirm'));

    expect(removeCover.mutate).toHaveBeenCalledWith(
      'playlist-1',
      expect.anything()
    );
  });

  it('offers no Remove without a custom cover', async () => {
    await renderSheet();

    expect(screen.queryByTestId('cover-remove')).not.toBeOnTheScreen();
  });
});
