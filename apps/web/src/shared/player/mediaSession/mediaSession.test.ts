import { afterEach, describe, expect, it, vi } from 'vitest';

import { bindSessionHandlers, publishMetadata } from './mediaSession';

type NavigatorWithSession = Navigator & { mediaSession?: unknown };

const originalSession = (navigator as NavigatorWithSession).mediaSession;

afterEach(() => {
  Object.defineProperty(navigator, 'mediaSession', {
    value: originalSession,
    configurable: true
  });
  vi.unstubAllGlobals();
});

function withSession(
  handler: (action: string, callback: (() => void) | null) => void
) {
  const setActionHandler = vi.fn(handler);
  const metadata: unknown[] = [];

  Object.defineProperty(navigator, 'mediaSession', {
    value: {
      set metadata(value: unknown) {
        metadata.push(value);
      },
      get metadata() {
        return metadata.at(-1);
      },
      setActionHandler
    },
    configurable: true
  });

  return { setActionHandler, metadata };
}

function withoutSession(): void {
  Object.defineProperty(navigator, 'mediaSession', {
    value: undefined,
    configurable: true
  });
}

describe('publishMetadata', () => {
  it('publishes the current track and clears when there is none', () => {
    const { metadata } = withSession(() => undefined);
    class FakeMetadata {
      constructor(readonly init: unknown) {}
    }
    vi.stubGlobal('MediaMetadata', FakeMetadata);

    publishMetadata({
      title: 'Naima',
      artist: '',
      album: 'PlayLiberty',
      artwork: [{ src: 'https://example.test/thumbnails/aa/aa.jpg' }]
    });

    expect(metadata.at(-1)).toMatchObject({
      init: {
        title: 'Naima',
        artist: '',
        album: 'PlayLiberty',
        artwork: [{ src: 'https://example.test/thumbnails/aa/aa.jpg' }]
      }
    });

    publishMetadata(null);
    expect(metadata.at(-1)).toBeNull();
  });

  it('does nothing rather than throwing when the API is absent', () => {
    withoutSession();

    expect(() => publishMetadata(null)).not.toThrow();
  });

  it('swallows a metadata constructor that throws', () => {
    withSession(() => undefined);
    vi.stubGlobal(
      'MediaMetadata',
      class {
        constructor() {
          throw new Error('unsupported');
        }
      }
    );

    expect(() =>
      publishMetadata({
        title: 'Naima',
        artist: '',
        album: 'PlayLiberty',
        artwork: []
      })
    ).not.toThrow();
  });
});

describe('bindSessionHandlers', () => {
  it('routes every action into the player', () => {
    const registered = new Map<string, () => void>();
    withSession((action, callback) => {
      if (callback !== null) {
        registered.set(action, callback);
      }
    });

    const handlers = {
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onNextTrack: vi.fn(),
      onPreviousTrack: vi.fn(),
      onSeekBackward: vi.fn(),
      onSeekForward: vi.fn()
    };
    const unbind = bindSessionHandlers(handlers);

    registered.get('play')?.();
    registered.get('pause')?.();
    registered.get('nexttrack')?.();
    registered.get('previoustrack')?.();
    registered.get('seekbackward')?.();
    registered.get('seekforward')?.();

    expect(handlers.onPlay).toHaveBeenCalledOnce();
    expect(handlers.onPause).toHaveBeenCalledOnce();
    expect(handlers.onNextTrack).toHaveBeenCalledOnce();
    expect(handlers.onPreviousTrack).toHaveBeenCalledOnce();
    expect(handlers.onSeekBackward).toHaveBeenCalledOnce();
    expect(handlers.onSeekForward).toHaveBeenCalledOnce();

    unbind();
  });

  it('keeps the other actions when one is rejected by the engine', () => {
    const registered = new Map<string, () => void>();
    withSession((action, callback) => {
      if (action === 'nexttrack') {
        throw new Error('unsupported action');
      }
      if (callback !== null) {
        registered.set(action, callback);
      }
    });

    const handlers = {
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onNextTrack: vi.fn(),
      onPreviousTrack: vi.fn(),
      onSeekBackward: vi.fn(),
      onSeekForward: vi.fn()
    };
    const unbind = bindSessionHandlers(handlers);

    registered.get('play')?.();

    expect(handlers.onPlay).toHaveBeenCalledOnce();
    expect(registered.has('nexttrack')).toBe(false);

    unbind();
  });

  it('returns a teardown that does nothing when the API is absent', () => {
    withoutSession();

    const unbind = bindSessionHandlers({
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onNextTrack: vi.fn(),
      onPreviousTrack: vi.fn(),
      onSeekBackward: vi.fn(),
      onSeekForward: vi.fn()
    });

    expect(() => unbind()).not.toThrow();
  });
});
