import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { usePlayerStore } from '../playerStore/playerStore';
import type { PlayerTrack } from '../playerTrack';
import type { StreamFailure } from '../streamFailure/streamFailure';
import { type SourceResolver, usePlayerAudio } from './usePlayerAudio';

jest.mock('expo-audio', () => {
  const player = {
    replace: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve())
  };
  const status = {
    current: {
      didJustFinish: false,
      currentTime: 0,
      error: null,
      playing: true,
      isBuffering: false
    } as {
      didJustFinish: boolean;
      currentTime: number;
      error: string | null;
      playing: boolean;
      isBuffering: boolean;
    }
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

jest.mock('../../auth/sessionStore/sessionStore', () => {
  const expire = jest.fn(() => Promise.resolve());

  return {
    __esModule: true,
    __expire: expire,
    useSessionStore: { getState: () => ({ expire }) }
  };
});

interface AudioMock {
  readonly __player: {
    readonly replace: jest.Mock;
    readonly play: jest.Mock;
    readonly pause: jest.Mock;
    readonly seekTo: jest.Mock;
  };
  readonly __status: {
    current: {
      didJustFinish: boolean;
      currentTime: number;
      error: string | null;
      playing: boolean;
      isBuffering: boolean;
    };
  };
}

interface SessionMock {
  readonly __expire: jest.Mock;
}

const audio = jest.requireMock<AudioMock>('expo-audio');
const session = jest.requireMock<SessionMock>(
  '../../auth/sessionStore/sessionStore'
);
const resolveSource = (trackId: string): { uri: string } => ({ uri: trackId });
const classifyFailure = jest.fn(async (): Promise<StreamFailure> => ({
  kind: 'unknown'
}));

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
  audio.__status.current = {
    didJustFinish: false,
    currentTime: 0,
    error: null,
    playing: true,
    isBuffering: false
  };
});

describe('the player audio', () => {
  it('loads only the track that was reached', async () => {
    start(['a', 'b'], 'a');

    await renderHook(() => usePlayerAudio(resolveSource, classifyFailure));

    expect(audio.__player.replace).toHaveBeenCalledTimes(1);
    expect(audio.__player.replace).toHaveBeenLastCalledWith({ uri: 'a' });

    await act(() => {
      usePlayerStore.getState().play('b');
    });

    expect(audio.__player.replace).toHaveBeenCalledTimes(2);
    expect(audio.__player.replace).toHaveBeenLastCalledWith({ uri: 'b' });
  });

  it('loads a track whose source arrives after the queue starts', async () => {
    start(['a'], 'a');
    const view = await renderHook(
      ({ resolver }: { resolver: SourceResolver }) =>
        usePlayerAudio(resolver, classifyFailure),
      { initialProps: { resolver: () => null } }
    );

    expect(audio.__player.replace).not.toHaveBeenCalled();

    await view.rerender({ resolver: resolveSource });

    await waitFor(() => {
      expect(audio.__player.replace).toHaveBeenLastCalledWith({ uri: 'a' });
    });
  });

  it('does not rebuild the playing source when the resolver changes', async () => {
    start(['a', 'b'], 'a');
    const view = await renderHook(
      ({ resolver }: { resolver: typeof resolveSource }) =>
        usePlayerAudio(resolver, classifyFailure),
      { initialProps: { resolver: resolveSource } }
    );

    await view.rerender({
      resolver: (trackId: string) => ({ uri: `${trackId}-renewed` })
    });

    expect(audio.__player.replace).toHaveBeenCalledTimes(1);
    expect(audio.__player.replace).toHaveBeenLastCalledWith({ uri: 'a' });

    await act(() => {
      usePlayerStore.getState().play('b');
    });

    expect(audio.__player.replace).toHaveBeenLastCalledWith({
      uri: 'b-renewed'
    });
  });

  it('plays and pauses the same source with the player state', async () => {
    start(['a'], 'a');

    await renderHook(() => usePlayerAudio(resolveSource, classifyFailure));

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

  it('follows the player through a focus pause and resume', async () => {
    start(['a'], 'a');
    const view = await renderHook(() =>
      usePlayerAudio(resolveSource, classifyFailure)
    );

    await act(() => {
      audio.__status.current = {
        didJustFinish: false,
        currentTime: 5,
        error: null,
        playing: false,
        isBuffering: false
      };
    });
    await view.rerender({});

    expect(usePlayerStore.getState().isPlaying).toBe(false);

    await act(() => {
      audio.__status.current = {
        didJustFinish: false,
        currentTime: 5,
        error: null,
        playing: true,
        isBuffering: false
      };
    });
    await view.rerender({});

    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('does not read a buffering gap as a pause', async () => {
    start(['a'], 'a');
    const view = await renderHook(() =>
      usePlayerAudio(resolveSource, classifyFailure)
    );

    await act(() => {
      audio.__status.current = {
        didJustFinish: false,
        currentTime: 0,
        error: null,
        playing: false,
        isBuffering: true
      };
    });
    await view.rerender({});

    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('leaves a listener pause in place when the player stays paused', async () => {
    start(['a'], 'a');
    const view = await renderHook(() =>
      usePlayerAudio(resolveSource, classifyFailure)
    );

    await act(() => {
      usePlayerStore.getState().setPlaying(false);
    });
    await act(() => {
      audio.__status.current = {
        didJustFinish: false,
        currentTime: 5,
        error: null,
        playing: false,
        isBuffering: false
      };
    });
    await view.rerender({});

    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('reports the player position to the store', async () => {
    start(['a'], 'a');
    const view = await renderHook(() =>
      usePlayerAudio(resolveSource, classifyFailure)
    );

    await act(() => {
      audio.__status.current = {
        didJustFinish: false,
        currentTime: 12.5,
        error: null,
        playing: true,
        isBuffering: false
      };
    });
    await view.rerender({});

    expect(usePlayerStore.getState().positionSeconds).toBe(12.5);
  });

  it('applies a seek once', async () => {
    start(['a'], 'a');
    const view = await renderHook(() =>
      usePlayerAudio(resolveSource, classifyFailure)
    );

    await act(() => {
      usePlayerStore.getState().seekToFraction(0.5);
    });

    await waitFor(() => {
      expect(audio.__player.seekTo).toHaveBeenCalledWith(30);
    });
    expect(usePlayerStore.getState().seekTo).toBeNull();

    await view.rerender({});

    expect(audio.__player.seekTo).toHaveBeenCalledTimes(1);
  });

  it('seeks to the start when previous restarts the track', async () => {
    start(['a', 'b'], 'b');
    await renderHook(() => usePlayerAudio(resolveSource, classifyFailure));

    await act(() => {
      usePlayerStore.getState().setPosition(30);
      usePlayerStore.getState().skipPrevious();
    });

    await waitFor(() => {
      expect(audio.__player.seekTo).toHaveBeenCalledWith(0);
    });
    expect(usePlayerStore.getState().currentId).toBe('b');
    expect(usePlayerStore.getState().seekTo).toBeNull();
  });

  it('advances once when the track finishes', async () => {
    start(['a', 'b'], 'a');
    const view = await renderHook(() =>
      usePlayerAudio(resolveSource, classifyFailure)
    );

    await act(() => {
      audio.__status.current = {
        didJustFinish: true,
        currentTime: 60,
        error: null,
        playing: true,
        isBuffering: false
      };
    });
    await view.rerender({});

    expect(usePlayerStore.getState().currentId).toBe('b');

    await view.rerender({});

    expect(usePlayerStore.getState().currentId).toBe('b');
  });

  it('stops the player when the queue stops', async () => {
    start(['a'], 'a');

    await renderHook(() => usePlayerAudio(resolveSource, classifyFailure));

    await act(() => {
      usePlayerStore.getState().clear();
    });

    expect(audio.__player.pause).toHaveBeenCalled();
    expect(audio.__player.replace).toHaveBeenCalledTimes(1);
  });

  it('drops a gone track and advances', async () => {
    start(['a', 'b'], 'a');
    classifyFailure.mockResolvedValueOnce({ kind: 'gone' });
    const view = await renderHook(() =>
      usePlayerAudio(resolveSource, classifyFailure)
    );

    await act(() => {
      audio.__status.current = {
        didJustFinish: false,
        currentTime: 0,
        error: 'stream failed',
        playing: true,
        isBuffering: false
      };
    });
    await view.rerender({});

    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBe('b');
    });
    expect(usePlayerStore.getState().queue).toEqual(['b']);
    expect(audio.__player.replace).toHaveBeenLastCalledWith({ uri: 'b' });
  });

  it('stops when the last entry is gone', async () => {
    start(['a'], 'a');
    classifyFailure.mockResolvedValueOnce({ kind: 'gone' });
    const view = await renderHook(() =>
      usePlayerAudio(resolveSource, classifyFailure)
    );

    await act(() => {
      audio.__status.current = {
        didJustFinish: false,
        currentTime: 0,
        error: 'stream failed',
        playing: true,
        isBuffering: false
      };
    });
    await view.rerender({});

    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBeNull();
    });
    expect(usePlayerStore.getState().queue).toEqual([]);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('pauses on an unclassified refusal and names the track', async () => {
    start(['a', 'b'], 'a');
    classifyFailure.mockResolvedValueOnce({ kind: 'unknown' });
    const view = await renderHook(() =>
      usePlayerAudio(resolveSource, classifyFailure)
    );

    await act(() => {
      audio.__status.current = {
        didJustFinish: false,
        currentTime: 0,
        error: 'stream failed',
        playing: true,
        isBuffering: false
      };
    });
    await view.rerender({});

    await waitFor(() => {
      expect(usePlayerStore.getState().playbackFailureId).toBe('a');
    });
    expect(usePlayerStore.getState().currentId).toBe('a');
    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(usePlayerStore.getState().queue).toEqual(['a', 'b']);
  });

  it('reloads the stream with the renewed pair', async () => {
    const token = { id: 'access-2', secret: 'secret-2' };
    const resolver = jest.fn((trackId: string, pair?: unknown) => ({
      uri: pair === undefined ? trackId : `${trackId}:renewed`
    }));

    start(['a'], 'a');
    classifyFailure.mockResolvedValueOnce({ kind: 'retry', token });
    const view = await renderHook(() =>
      usePlayerAudio(resolver, classifyFailure)
    );

    await act(() => {
      audio.__status.current = {
        didJustFinish: false,
        currentTime: 0,
        error: 'stream failed',
        playing: true,
        isBuffering: false
      };
    });
    await view.rerender({});

    await waitFor(() => {
      expect(resolver).toHaveBeenLastCalledWith('a', token);
    });
    expect(audio.__player.replace).toHaveBeenLastCalledWith({
      uri: 'a:renewed'
    });
    expect(audio.__player.play).toHaveBeenCalled();
    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().playbackFailureId).toBeNull();
  });

  it('expires the session instead of drawing a broken track', async () => {
    start(['a'], 'a');
    classifyFailure.mockResolvedValueOnce({ kind: 'session' });
    const view = await renderHook(() =>
      usePlayerAudio(resolveSource, classifyFailure)
    );

    await act(() => {
      audio.__status.current = {
        didJustFinish: false,
        currentTime: 0,
        error: 'stream failed',
        playing: true,
        isBuffering: false
      };
    });
    await view.rerender({});

    await waitFor(() => {
      expect(session.__expire).toHaveBeenCalled();
    });
    expect(usePlayerStore.getState().currentId).toBeNull();
    expect(usePlayerStore.getState().playbackFailureId).toBeNull();
  });

  it('ignores a classification that arrives after the playhead moved', async () => {
    let resolveKind: ((failure: StreamFailure) => void) | null = null;

    start(['a', 'b'], 'a');
    classifyFailure.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveKind = resolve;
        })
    );
    const view = await renderHook(() =>
      usePlayerAudio(resolveSource, classifyFailure)
    );

    await act(() => {
      audio.__status.current = {
        didJustFinish: false,
        currentTime: 0,
        error: 'stream failed',
        playing: true,
        isBuffering: false
      };
    });
    await view.rerender({});

    await waitFor(() => {
      expect(classifyFailure).toHaveBeenCalledTimes(1);
    });

    await act(() => {
      usePlayerStore.getState().play('b');
    });

    await act(async () => {
      resolveKind?.({ kind: 'gone' });
      await Promise.resolve();
    });

    expect(usePlayerStore.getState().currentId).toBe('b');
    expect(usePlayerStore.getState().queue).toEqual(['a', 'b']);
  });
});
