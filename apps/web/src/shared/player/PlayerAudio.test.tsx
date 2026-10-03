import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PlayerAudio from './PlayerAudio';
import { usePlayerStore } from './playerStore';
import type { PlayerTrack } from './types';

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
 * jsdom has no media pipeline: `play` and `pause` throw "Not implemented", and
 * `currentTime` is a setter that does record but that a real element would clamp.
 * The element is stubbed here rather than replaced, so the component under test is
 * the real one and only the browser's missing half is supplied.
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
    expect(document.querySelectorAll('audio')).toHaveLength(1);
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
        queue: [first],
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
});
