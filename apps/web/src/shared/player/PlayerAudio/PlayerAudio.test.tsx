import { act, render } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '../../../testing/mocks/server';
import { usePlayerStore } from '../playerStore/playerStore';
import type { PlayerTrack } from '../types';
import PlayerAudio from './PlayerAudio';

const PLAYLIST = 'playlist-1';

function track(id: string): PlayerTrack {
  return {
    id,
    title: id,
    playlistId: PLAYLIST,
    playlistName: 'The Queue Playlist',
    durationSeconds: 180,
    thumbnailPath: null
  };
}

const first = track('track-1');
const second = track('track-2');

/*
 * jsdom has no media pipeline (`play`/`pause` throw), so the element is
 * stubbed, not replaced: the real component runs on a faked browser half.
 */
let playMock: ReturnType<typeof vi.fn>;
let pauseMock: ReturnType<typeof vi.fn>;

function audio(): HTMLAudioElement {
  const element = document.querySelector('audio');

  if (element === null) {
    throw new Error('The player rendered no audio element.');
  }

  return element;
}

beforeEach(() => {
  usePlayerStore.getState().clear();
  playMock = vi.fn(() => Promise.resolve());
  pauseMock = vi.fn();
  HTMLMediaElement.prototype.play = playMock as unknown as () => Promise<void>;
  HTMLMediaElement.prototype.pause = pauseMock as unknown as () => void;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PlayerAudio', () => {
  it('derives the stream address from the current track id', () => {
    render(<PlayerAudio />);
    expect(audio().getAttribute('src')).toBeNull();

    act(() => {
      usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    });

    expect(audio().getAttribute('src')).toBe('/api/v1/tracks/track-1/stream');
    expect(playMock).toHaveBeenCalled();
  });

  it('plays exactly one track at a time when the track changes', () => {
    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    });
    act(() => {
      usePlayerStore.getState().skipNext();
    });

    expect(audio().getAttribute('src')).toBe('/api/v1/tracks/track-2/stream');
  });

  it('starts the new source whenever the track changes while playing', () => {
    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    });
    expect(playMock).toHaveBeenCalledTimes(1);

    act(() => {
      usePlayerStore.getState().skipNext();
    });
    expect(playMock).toHaveBeenCalledTimes(2);

    act(() => {
      usePlayerStore.getState().skipPrevious();
    });
    expect(audio().getAttribute('src')).toBe('/api/v1/tracks/track-1/stream');
    expect(playMock).toHaveBeenCalledTimes(3);
  });

  it('pauses and resumes without losing the place', () => {
    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    });
    act(() => {
      audio().dispatchEvent(new Event('timeupdate'));
    });

    act(() => {
      usePlayerStore.getState().setPlaying(false);
    });
    expect(pauseMock).toHaveBeenCalled();

    act(() => {
      usePlayerStore.getState().setPlaying(true);
    });
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
  });

  it('applies the persisted offset once the track metadata is known', () => {
    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().hydrate({
        sourceQueue: [first],
        currentId: first.id,
        positionSeconds: 42,
        volume: 1
      });
      usePlayerStore.getState().setPlaying(true);
    });

    act(() => {
      audio().dispatchEvent(new Event('loadedmetadata'));
    });

    expect(audio().currentTime).toBe(42);
  });

  it('applies the persisted offset only once', () => {
    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().hydrate({
        sourceQueue: [first],
        currentId: first.id,
        positionSeconds: 42,
        volume: 1
      });
    });

    act(() => {
      audio().dispatchEvent(new Event('loadedmetadata'));
    });
    expect(audio().currentTime).toBe(42);

    audio().currentTime = 10;

    act(() => {
      audio().dispatchEvent(new Event('loadedmetadata'));
    });

    expect(audio().currentTime).toBe(10);
  });

  it('stops the Media Session seek controls at the track ends', () => {
    const handlers = new Map<string, () => void>();

    Object.defineProperty(navigator, 'mediaSession', {
      value: {
        metadata: null,
        setActionHandler: (action: string, handler: (() => void) | null) => {
          if (handler !== null) {
            handlers.set(action, handler);
          }
        }
      },
      configurable: true
    });

    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    });
    act(() => {
      usePlayerStore.getState().setPosition(175);
    });
    act(() => {
      handlers.get('seekforward')?.();
    });

    expect(usePlayerStore.getState().positionSeconds).toBe(180);

    act(() => {
      usePlayerStore.getState().setPosition(5);
    });
    act(() => {
      handlers.get('seekbackward')?.();
    });

    expect(usePlayerStore.getState().positionSeconds).toBe(0);
  });

  it('moves the element immediately when a seek is asked for', () => {
    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    });

    act(() => {
      usePlayerStore.getState().seek(90);
    });

    expect(audio().currentTime).toBe(90);
    expect(usePlayerStore.getState().seekTo).toBeNull();
  });

  it('applies the stored volume to the element', () => {
    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().setVolume(0.3);
    });

    expect(audio().volume).toBeCloseTo(0.3);
  });

  it('advances when a track ends and stops when the queue is spent', () => {
    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    });

    act(() => {
      audio().dispatchEvent(new Event('ended'));
    });
    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    act(() => {
      audio().dispatchEvent(new Event('ended'));
    });
    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('stops rather than play when the browser refuses to start audio', async () => {
    playMock.mockImplementation(() => Promise.reject(new Error('not allowed')));
    render(<PlayerAudio />);

    await act(async () => {
      usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    });

    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('publishes the thumbnail route as absolute artwork for a track that has one', () => {
    class FakeMetadata {
      constructor(readonly init: { artwork?: { src: string }[] }) {}
    }
    vi.stubGlobal('MediaMetadata', FakeMetadata);

    const published: FakeMetadata[] = [];

    Object.defineProperty(navigator, 'mediaSession', {
      value: {
        get metadata() {
          return published.at(-1) ?? null;
        },
        set metadata(value: FakeMetadata | null) {
          if (value !== null) {
            published.push(value);
          }
        },
        setActionHandler: () => undefined
      },
      configurable: true
    });

    const withArt = { ...first, thumbnailPath: 'thumbnails/aa/aa.jpg' };
    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().startQueue(PLAYLIST, [withArt], withArt.id);
    });

    expect(published.at(-1)?.init.artwork).toEqual([
      { src: 'http://localhost:3000/api/v1/tracks/track-1/thumbnail' }
    ]);
  });

  it('publishes no artwork for a track without a thumbnail', () => {
    class FakeMetadata {
      constructor(readonly init: { artwork?: { src: string }[] }) {}
    }
    vi.stubGlobal('MediaMetadata', FakeMetadata);

    const published: FakeMetadata[] = [];

    Object.defineProperty(navigator, 'mediaSession', {
      value: {
        get metadata() {
          return published.at(-1) ?? null;
        },
        set metadata(value: FakeMetadata | null) {
          if (value !== null) {
            published.push(value);
          }
        },
        setActionHandler: () => undefined
      },
      configurable: true
    });

    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    });

    expect(published.at(-1)?.init.artwork).toEqual([]);
  });

  it('names the playlist the queue came from as the album', () => {
    class FakeMetadata {
      constructor(readonly init: { album?: string }) {}
    }
    vi.stubGlobal('MediaMetadata', FakeMetadata);

    const published: FakeMetadata[] = [];

    Object.defineProperty(navigator, 'mediaSession', {
      value: {
        get metadata() {
          return published.at(-1) ?? null;
        },
        set metadata(value: FakeMetadata | null) {
          if (value !== null) {
            published.push(value);
          }
        },
        setActionHandler: () => undefined
      },
      configurable: true
    });

    const named = { ...first, playlistName: 'Rain On The Window' };
    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().startQueue(PLAYLIST, [named], named.id);
    });

    expect(published.at(-1)?.init.album).toBe('Rain On The Window');
  });

  it('does not throw when the Media Session API is absent', () => {
    Object.defineProperty(navigator, 'mediaSession', {
      value: undefined,
      configurable: true
    });

    expect(() => {
      render(<PlayerAudio />);
      act(() => {
        usePlayerStore
          .getState()
          .startQueue(PLAYLIST, [first, second], first.id);
      });
    }).not.toThrow();
  });

  it('drops a track the stream says is gone and advances', async () => {
    server.use(
      http.head('http://localhost:3000/api/v1/tracks/track-1/stream', () =>
        HttpResponse.json({ title: 'Not found' }, { status: 404 })
      )
    );

    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    });

    await act(async () => {
      audio().dispatchEvent(new Event('error'));
    });

    const state = usePlayerStore.getState();

    expect(state.queue.map(item => item.id)).toEqual(['track-2']);
    expect(state.currentId).toBe('track-2');
    expect(state.isPlaying).toBe(true);
  });

  it('keeps the track and stops when the failure cannot be classified', async () => {
    server.use(
      http.head('http://localhost:3000/api/v1/tracks/track-1/stream', () =>
        HttpResponse.error()
      )
    );

    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    });

    await act(async () => {
      audio().dispatchEvent(new Event('error'));
    });

    const state = usePlayerStore.getState();

    expect(state.queue.map(item => item.id)).toEqual(['track-1', 'track-2']);
    expect(state.currentId).toBe('track-1');
    expect(state.isPlaying).toBe(false);
  });

  it('re-authenticates instead of dropping the track when the session expired', async () => {
    server.use(
      http.head('http://localhost:3000/api/v1/tracks/track-1/stream', () =>
        HttpResponse.json({ title: 'Unauthorized' }, { status: 401 })
      )
    );

    render(<PlayerAudio />);

    act(() => {
      usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    });

    await act(async () => {
      audio().dispatchEvent(new Event('error'));
    });

    const state = usePlayerStore.getState();

    /*
     * The flag is the only edge-path part jsdom can show; the queue matters: a
     * session expiry is not a broken track, so nothing drops.
     */
    expect(window.sessionStorage.getItem('playliberty.re-auth-attempt')).toBe(
      '1'
    );
    expect(state.queue.map(item => item.id)).toEqual(['track-1', 'track-2']);
    expect(state.currentId).toBe('track-1');
  });
});
