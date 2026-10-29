import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlayerStore } from '../playerStore/playerStore';
import { queuePlaylistId } from '../types';
import type { PlayerTrack } from '../types';
import {
  PLAYER_STORAGE_KEY,
  attachPlayerPersistence,
  readPlayerState,
  writePlayerState
} from './playerPersistence';

const PLAYLIST = 'playlist-1';
const track: PlayerTrack = {
  id: 'track-1',
  title: 'First',
  playlistId: 'playlist-1',
  playlistName: 'The Queue Playlist',
  durationSeconds: 180,
  thumbnailPath: null
};
const bare: PlayerTrack = {
  ...track,
  playlistId: null,
  playlistName: null
};
const second: PlayerTrack = { ...track, id: 'track-2', title: 'Second' };
const third: PlayerTrack = { ...track, id: 'track-3', title: 'Third' };

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
  vi.restoreAllMocks();
});

describe('player persistence', () => {
  it('round-trips the persisted slice and rejects junk', () => {
    writePlayerState(window.sessionStorage, {
      sourceQueue: [track],
      orderIds: [track.id],
      shuffle: true,
      currentId: track.id,
      positionSeconds: 12,
      volume: 0.4
    });

    expect(readPlayerState(window.sessionStorage)).toEqual({
      sourceQueue: [track],
      orderIds: [track.id],
      shuffle: true,
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
      orderIds: [],
      shuffle: false,
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
      orderIds: [],
      shuffle: false,
      currentId: track.id,
      positionSeconds: 12,
      volume: 1
    });
  });

  it('hydrates once and never autoplays', () => {
    writePlayerState(window.sessionStorage, {
      sourceQueue: [track],
      orderIds: [],
      shuffle: false,
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

  it('persists the shuffled order beside the playlist order', () => {
    /* A fixed draw, so the written order is asserted rather than sampled. */
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const detach = attach();

    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [track, second, third], track.id, true);
    window.dispatchEvent(new Event('pagehide'));

    const persisted = readPlayerState(window.sessionStorage);

    expect(persisted?.sourceQueue).toEqual([track, second, third]);
    expect(persisted?.shuffle).toBe(true);
    expect(persisted?.orderIds).toEqual([track.id, third.id, second.id]);

    detach();
  });

  it('resumes a shuffled queue as it was left, on the same track and offset', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const detachFirst = attach();

    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [track, second, third], track.id, true);
    usePlayerStore.getState().setPosition(37);
    window.dispatchEvent(new Event('pagehide'));
    detachFirst();

    /* A relaunch: a fresh store, then the persistence hydrates it. */
    usePlayerStore.getState().clear();
    const detachSecond = attach();
    const state = usePlayerStore.getState();

    expect(state.shuffle).toBe(true);
    expect(state.queue).toEqual([track, third, second]);
    expect(state.currentId).toBe(track.id);
    expect(state.positionSeconds).toBe(37);
    expect(state.isPlaying).toBe(false);

    detachSecond();
  });

  it('flushes a pending write when the page is hidden', () => {
    const detach = attach();

    usePlayerStore.getState().startQueue(PLAYLIST, [track], track.id);
    expect(readPlayerState(window.sessionStorage)).toBeNull();

    window.dispatchEvent(new Event('pagehide'));
    expect(readPlayerState(window.sessionStorage)?.sourceQueue).toEqual([
      track
    ]);

    detach();
  });

  it('round-trips a track started on its own', () => {
    writePlayerState(window.sessionStorage, {
      sourceQueue: [bare],
      orderIds: [],
      shuffle: false,
      currentId: bare.id,
      positionSeconds: 4,
      volume: 1
    });

    expect(readPlayerState(window.sessionStorage)).toEqual({
      sourceQueue: [bare],
      orderIds: [],
      shuffle: false,
      currentId: bare.id,
      positionSeconds: 4,
      volume: 1
    });
  });

  it('restores a bare queue paused at its position', () => {
    const detachFirst = attach();

    usePlayerStore.getState().startBareTrack({
      id: bare.id,
      title: bare.title,
      durationSeconds: bare.durationSeconds,
      thumbnailPath: bare.thumbnailPath
    });
    usePlayerStore.getState().setPosition(37);
    window.dispatchEvent(new Event('pagehide'));
    detachFirst();

    /* A relaunch: a fresh store, then the persistence hydrates it. */
    usePlayerStore.getState().clear();
    const detachSecond = attach();
    const state = usePlayerStore.getState();

    expect(state.queue).toEqual([bare]);
    expect(state.currentId).toBe(bare.id);
    expect(state.positionSeconds).toBe(37);
    expect(state.isPlaying).toBe(false);
    expect(queuePlaylistId(state)).toBeNull();

    detachSecond();
  });

  it('restores the queue and the offset on a relaunch', () => {
    const detachFirst = attach();
    usePlayerStore.getState().startQueue(PLAYLIST, [track], track.id);
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
