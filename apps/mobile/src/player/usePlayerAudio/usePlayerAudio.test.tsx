import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { usePlayerStore } from '../playerStore/playerStore';
import type { PlayerTrack } from '../playerTrack/playerTrack';
import { usePlayerAudio } from './usePlayerAudio';

jest.mock('expo-audio', () => {
  const player = {
    replace: jest.fn(),
    play: jest.fn(),
    pause: jest.fn()
  };
  const status = {
    current: { didJustFinish: false } as { didJustFinish: boolean }
  };

  return {
    __esModule: true,
    __player: player,
    __status: status,
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    useAudioPlayer: () => player,
    useAudioPlayerStatus: () => status.current
  };
});

interface AudioMock {
  readonly __player: {
    readonly replace: jest.Mock;
    readonly play: jest.Mock;
    readonly pause: jest.Mock;
  };
  readonly __status: { current: { didJustFinish: boolean } };
}

const audio = jest.requireMock<AudioMock>('expo-audio');
const resolveSource = (trackId: string): { uri: string } => ({ uri: trackId });

function track(id: string): PlayerTrack {
  return {
    id,
    title: `Track ${id}`,
    durationSeconds: 60,
    thumbnailPath: null
  };
}

function start(ids: readonly string[], currentId: string): void {
  usePlayerStore
    .getState()
    .start(
      ids.map(track),
      { id: 'playlist-1', name: 'Playlist One' },
      currentId
    );
}

beforeEach(() => {
  jest.clearAllMocks();
  usePlayerStore.getState().clear();
  audio.__status.current = { didJustFinish: false };
});

describe('the player audio', () => {
  it('loads only the track that was reached', async () => {
    start(['a', 'b'], 'a');

    await renderHook(() => usePlayerAudio(resolveSource));

    expect(audio.__player.replace).toHaveBeenCalledTimes(1);
    expect(audio.__player.replace).toHaveBeenLastCalledWith({ uri: 'a' });

    await act(() => {
      usePlayerStore.getState().play('b');
    });

    expect(audio.__player.replace).toHaveBeenCalledTimes(2);
    expect(audio.__player.replace).toHaveBeenLastCalledWith({ uri: 'b' });
  });

  it('plays and pauses the same source with the player state', async () => {
    start(['a'], 'a');

    await renderHook(() => usePlayerAudio(resolveSource));

    expect(audio.__player.play).toHaveBeenCalled();

    await act(() => {
      usePlayerStore.getState().setPlaying(false);
    });

    expect(audio.__player.pause).toHaveBeenCalled();

    await act(() => {
      usePlayerStore.getState().setPlaying(true);
    });

    expect(audio.__player.play).toHaveBeenCalledTimes(2);
    expect(audio.__player.replace).toHaveBeenCalledTimes(1);
  });

  it('advances once when the track finishes', async () => {
    start(['a', 'b'], 'a');
    const view = await renderHook(() => usePlayerAudio(resolveSource));

    await act(() => {
      audio.__status.current = { didJustFinish: true };
    });
    await view.rerender({});

    expect(usePlayerStore.getState().currentId).toBe('b');

    await view.rerender({});

    expect(usePlayerStore.getState().currentId).toBe('b');
  });

  it('clears the source when the queue stops', async () => {
    start(['a'], 'a');

    await renderHook(() => usePlayerAudio(resolveSource));

    await act(() => {
      usePlayerStore.getState().clear();
    });

    expect(audio.__player.pause).toHaveBeenCalled();
    expect(audio.__player.replace).toHaveBeenLastCalledWith(null);
  });
});
