import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

import { I18nProvider, Language } from '@playliberty/i18n';

import type { ApiConfig } from '../../../auth/useApiConfig';
import { usePlayerStore } from '../../playerStore/playerStore';
import type { PlayerTrack } from '../../playerTrack/playerTrack';
import { useBackgroundPlayback } from './useBackgroundPlayback';

jest.mock('expo-audio', () => ({
  requestNotificationPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true })
  )
}));

jest.mock('../backgroundPlayback', () => {
  const start = jest.fn(() => Promise.resolve(true));
  const update = jest.fn();
  const stop = jest.fn();
  const addCommandListener = jest.fn(() => ({ remove: jest.fn() }));

  return {
    backgroundPlayback: { start, update, stop, addCommandListener },
    __start: start,
    __update: update,
    __stop: stop,
    __addCommandListener: addCommandListener
  };
});

const playback = jest.requireMock<{
  __start: jest.Mock;
  __update: jest.Mock;
  __stop: jest.Mock;
  __addCommandListener: jest.Mock;
}>('../backgroundPlayback');
const { requestNotificationPermissionsAsync } = jest.requireMock<{
  requestNotificationPermissionsAsync: jest.Mock;
}>('expo-audio');

const store = { getItem: () => null, setItem: () => {} };

const config: ApiConfig = {
  baseUrl: 'https://instance.test',
  token: { id: 'token-id', secret: 'token-secret' }
};

const track: PlayerTrack = {
  id: 'track-1',
  title: 'First Song',
  durationSeconds: 182,
  thumbnailPath: 'thumbs/1.jpg'
};

function wrapper({ children }: { readonly children: ReactNode }) {
  return (
    <I18nProvider initialLanguage={Language.English} storage={store}>
      {children}
    </I18nProvider>
  );
}

const secondTrack: PlayerTrack = {
  ...track,
  id: 'track-2',
  title: 'Second Song'
};

const thirdTrack: PlayerTrack = {
  ...track,
  id: 'track-3',
  title: 'Third Song'
};

async function startQueue(
  tracks: readonly PlayerTrack[] = [track],
  currentId = track.id
): Promise<void> {
  usePlayerStore
    .getState()
    .start(tracks, { id: 'playlist-1', name: 'Rain On The Window' }, currentId);
}

beforeEach(() => {
  jest.clearAllMocks();
  usePlayerStore.getState().clear();
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => 'android'
  });
});

describe('the background playback bridge', () => {
  it('starts on the first track and mirrors the player state', async () => {
    await startQueue();

    await renderHook(() => useBackgroundPlayback(config), { wrapper });

    await waitFor(() => {
      expect(playback.__start).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'First Song',
          playlistName: 'Rain On The Window',
          isPlaying: true,
          positionSeconds: 0,
          canNext: false
        })
      );
    });

    await act(() => {
      usePlayerStore.getState().setPlaying(false);
    });

    expect(playback.__update).toHaveBeenLastCalledWith(
      expect.objectContaining({ isPlaying: false })
    );
  });

  it('stops when the queue clears', async () => {
    await startQueue();

    await renderHook(() => useBackgroundPlayback(config), { wrapper });

    await waitFor(() => {
      expect(playback.__start).toHaveBeenCalled();
    });

    await act(() => {
      usePlayerStore.getState().clear();
    });

    expect(playback.__stop).toHaveBeenCalled();
  });

  it('shows the refused-permission notice once', async () => {
    requestNotificationPermissionsAsync.mockResolvedValueOnce({
      granted: false
    } as never);
    await startQueue();

    await renderHook(() => useBackgroundPlayback(config), { wrapper });

    await waitFor(() => {
      expect(usePlayerStore.getState().backgroundNotice).toBe(true);
    });
    expect(playback.__start).toHaveBeenCalled();
  });

  it('toggles the player from a service command', async () => {
    await startQueue();

    await renderHook(() => useBackgroundPlayback(config), { wrapper });

    await waitFor(() => {
      expect(playback.__addCommandListener).toHaveBeenCalled();
    });

    const listener = playback.__addCommandListener.mock.calls[0]?.[0] as (
      command: string,
      position?: number
    ) => void;

    await act(() => {
      listener('toggle');
    });

    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('mirrors the position for the notification', async () => {
    await startQueue();
    await renderHook(() => useBackgroundPlayback(config), { wrapper });

    await waitFor(() => {
      expect(playback.__start).toHaveBeenCalled();
    });

    await act(() => {
      usePlayerStore.getState().setPosition(12);
    });

    expect(playback.__update).toHaveBeenLastCalledWith(
      expect.objectContaining({ positionSeconds: 12 })
    );
  });

  it('moves with previous and next from the service', async () => {
    await startQueue([track, secondTrack, thirdTrack]);
    await renderHook(() => useBackgroundPlayback(config), { wrapper });

    await waitFor(() => {
      expect(playback.__addCommandListener).toHaveBeenCalled();
    });

    const listener = playback.__addCommandListener.mock.calls[0]?.[0] as (
      command: string,
      position?: number
    ) => void;

    await act(() => {
      listener('next');
    });
    expect(usePlayerStore.getState().currentId).toBe('track-2');

    await act(() => {
      listener('previous');
    });
    expect(usePlayerStore.getState().currentId).toBe('track-1');

    await act(() => {
      listener('seek', 30);
    });
    expect(usePlayerStore.getState().positionSeconds).toBe(30);
    expect(usePlayerStore.getState().seekTo).toBe(30);
  });
});
