import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  PLAYER_STORAGE_KEY,
  attachPlayerPersistence,
  readPlayerState,
  writePlayerState
} from './playerPersistence';
import { usePlayerStore } from './playerStore';
import type { PlayerTrack } from './types';

const track: PlayerTrack = { id: 'track-1', title: 'First' };

function attach(): () => void {
  return attachPlayerPersistence({
    store: usePlayerStore,
    storage: window.localStorage,
    target: window,
    document: window.document
  });
}

beforeEach(() => {
  window.localStorage.clear();
  usePlayerStore.getState().clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('player persistence', () => {
  it('round-trips the persisted slice and rejects junk', () => {
    writePlayerState(window.localStorage, {
      queue: [track],
      currentId: track.id,
      positionSeconds: 12
    });

    expect(readPlayerState(window.localStorage)).toEqual({
      queue: [track],
      currentId: track.id,
      positionSeconds: 12
    });

    window.localStorage.setItem(PLAYER_STORAGE_KEY, '{"queue":"nope"}');
    expect(readPlayerState(window.localStorage)).toBeNull();
  });

  it('hydrates once and never autoplays', () => {
    writePlayerState(window.localStorage, {
      queue: [track],
      currentId: track.id,
      positionSeconds: 12
    });

    const detach = attach();

    expect(usePlayerStore.getState().currentId).toBe(track.id);
    expect(usePlayerStore.getState().positionSeconds).toBe(12);
    expect(usePlayerStore.getState().isPlaying).toBe(false);

    detach();
  });

  it('flushes a pending write when the page is hidden', () => {
    const detach = attach();

    usePlayerStore.getState().enqueue(track);
    expect(readPlayerState(window.localStorage)).toBeNull();

    window.dispatchEvent(new Event('pagehide'));
    expect(readPlayerState(window.localStorage)?.queue).toEqual([track]);

    detach();
  });
});
