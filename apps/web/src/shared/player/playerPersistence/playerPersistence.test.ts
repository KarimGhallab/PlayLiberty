import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { usePlayerStore } from '../playerStore/playerStore';
import type { PlayerTrack } from '../types';
import {
  PLAYER_STORAGE_KEY,
  attachPlayerPersistence,
  readPlayerState,
  writePlayerState
} from './playerPersistence';

const track: PlayerTrack = {
  id: 'track-1',
  title: 'First',
  playlistId: 'playlist-1',
  playlistName: 'The Queue Playlist',
  durationSeconds: 180,
  thumbnailPath: null
};

function attach(): () => void {
  return attachPlayerPersistence({
    store: usePlayerStore,
    storage: window.sessionStorage,
    target: window,
    document: window.document
  });
}

beforeEach(() => {
  window.sessionStorage.clear();
  usePlayerStore.getState().clear();
});

afterEach(() => {
  window.sessionStorage.clear();
});

describe('player persistence', () => {
  it('round-trips the persisted slice and rejects junk', () => {
    writePlayerState(window.sessionStorage, {
      sourceQueue: [track],
      currentId: track.id,
      positionSeconds: 12,
      volume: 0.4
    });

    expect(readPlayerState(window.sessionStorage)).toEqual({
      sourceQueue: [track],
      currentId: track.id,
      positionSeconds: 12,
      volume: 0.4
    });

    window.sessionStorage.setItem(PLAYER_STORAGE_KEY, '{"sourceQueue":"nope"}');
    expect(readPlayerState(window.sessionStorage)).toBeNull();
  });

  it('reads a payload written before the source order existed as its own order', () => {
    window.sessionStorage.setItem(
      PLAYER_STORAGE_KEY,
      JSON.stringify({
        queue: [track],
        currentId: track.id,
        positionSeconds: 12,
        volume: 0.8
      })
    );

    expect(readPlayerState(window.sessionStorage)).toEqual({
      sourceQueue: [track],
      currentId: track.id,
      positionSeconds: 12,
      volume: 0.8
    });
  });

  it('keeps a payload written before the volume existed and defaults it', () => {
    window.sessionStorage.setItem(
      PLAYER_STORAGE_KEY,
      JSON.stringify({
        sourceQueue: [track],
        currentId: track.id,
        positionSeconds: 12
      })
    );

    expect(readPlayerState(window.sessionStorage)).toEqual({
      sourceQueue: [track],
      currentId: track.id,
      positionSeconds: 12,
      volume: 1
    });
  });

  it('hydrates once and never autoplays', () => {
    writePlayerState(window.sessionStorage, {
      sourceQueue: [track],
      currentId: track.id,
      positionSeconds: 12,
      volume: 1
    });

    const detach = attach();

    expect(usePlayerStore.getState().currentId).toBe(track.id);
    expect(usePlayerStore.getState().positionSeconds).toBe(12);
    expect(usePlayerStore.getState().volume).toBe(1);
    expect(usePlayerStore.getState().isPlaying).toBe(false);

    detach();
  });

  it('persists the playlist order, not the order the shuffle left', () => {
    const detach = attach();

    usePlayerStore
      .getState()
      .startQueue(track.playlistId, [track], track.id, true);
    window.dispatchEvent(new Event('pagehide'));

    expect(readPlayerState(window.sessionStorage)?.sourceQueue).toEqual([
      track
    ]);

    detach();
  });

  it('flushes a pending write when the page is hidden', () => {
    const detach = attach();

    usePlayerStore.getState().startQueue(track.playlistId, [track], track.id);
    expect(readPlayerState(window.sessionStorage)).toBeNull();

    window.dispatchEvent(new Event('pagehide'));
    expect(readPlayerState(window.sessionStorage)?.sourceQueue).toEqual([
      track
    ]);

    detach();
  });

  it('restores the queue and the offset on a relaunch', () => {
    const detachFirst = attach();
    usePlayerStore.getState().startQueue(track.playlistId, [track], track.id);
    usePlayerStore.getState().setPosition(37);
    window.dispatchEvent(new Event('pagehide'));
    detachFirst();

    /* A relaunch: a fresh store, then the persistence hydrates it. */
    usePlayerStore.getState().clear();
    const detachSecond = attach();

    expect(usePlayerStore.getState().queue).toEqual([track]);
    expect(usePlayerStore.getState().currentId).toBe(track.id);
    expect(usePlayerStore.getState().positionSeconds).toBe(37);
    expect(usePlayerStore.getState().isPlaying).toBe(false);

    detachSecond();
  });
});
