import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { PlayerTrack } from '../playerTrack/playerTrack';
import { usePlayerStore } from './playerStore';

function track(id: string): PlayerTrack {
  return {
    id,
    title: `Track ${id}`,
    durationSeconds: 60,
    thumbnailPath: null
  };
}

function start(
  queue: readonly string[],
  currentId: string,
  shuffle = false
): void {
  usePlayerStore
    .getState()
    .start(
      queue.map(track),
      { id: 'playlist-1', name: 'Playlist One' },
      currentId,
      shuffle
    );
}

beforeEach(() => {
  jest.restoreAllMocks();
  usePlayerStore.getState().clear();
});

describe('the player store', () => {
  it('carries the current track and the playlist it came from', () => {
    start(['a', 'b'], 'b');

    const state = usePlayerStore.getState();

    expect(state.queue).toEqual(['a', 'b']);
    expect(state.currentId).toBe('b');
    expect(state.tracks.b).toEqual(track('b'));
    expect(state.playlistId).toBe('playlist-1');
    expect(state.playlistName).toBe('Playlist One');
    expect(state.isPlaying).toBe(true);
    expect(state.positionSeconds).toBe(0);
  });

  it('starts a bare track with no playlist context', () => {
    usePlayerStore.getState().startBareTrack(track('a'));

    const state = usePlayerStore.getState();

    expect(state.queue).toEqual(['a']);
    expect(state.sourceQueue).toEqual(['a']);
    expect(state.currentId).toBe('a');
    expect(state.playlistId).toBeNull();
    expect(state.playlistName).toBeNull();
    expect(state.isPlaying).toBe(true);
  });

  it('advances to the next track', () => {
    start(['a', 'b', 'c'], 'a');
    usePlayerStore.getState().setPosition(20);

    usePlayerStore.getState().advance();

    expect(usePlayerStore.getState().currentId).toBe('b');
    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
  });

  it('ends the queue after the last track', () => {
    start(['a', 'b'], 'b');
    usePlayerStore.getState().setPosition(20);

    usePlayerStore.getState().advance();

    expect(usePlayerStore.getState().currentId).toBeNull();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
  });

  it('drops the current track and advances', () => {
    start(['a', 'b', 'c'], 'b');

    usePlayerStore.getState().drop('b');

    expect(usePlayerStore.getState().queue).toEqual(['a', 'c']);
    expect(usePlayerStore.getState().currentId).toBe('c');
  });

  it('ends the queue when the dropped track was the last', () => {
    start(['a', 'b'], 'b');

    usePlayerStore.getState().drop('b');

    expect(usePlayerStore.getState().currentId).toBeNull();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('leaves the current track when another one is dropped', () => {
    start(['a', 'b', 'c'], 'b');

    usePlayerStore.getState().drop('a');

    expect(usePlayerStore.getState().queue).toEqual(['b', 'c']);
    expect(usePlayerStore.getState().currentId).toBe('b');
  });

  it('drops the track from the playlist order too', () => {
    start(['a', 'b', 'c'], 'b');

    usePlayerStore.getState().drop('a');

    expect(usePlayerStore.getState().sourceQueue).toEqual(['b', 'c']);
  });

  it('moves the playhead without rebuilding the queue', () => {
    start(['a', 'b', 'c'], 'a');
    usePlayerStore.getState().setPlaying(false);
    usePlayerStore.getState().setPosition(20);

    usePlayerStore.getState().play('c');

    expect(usePlayerStore.getState().queue).toEqual(['a', 'b', 'c']);
    expect(usePlayerStore.getState().currentId).toBe('c');
    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
  });

  it('leaves the queue when the playhead is not in it', () => {
    start(['a', 'b'], 'a');

    usePlayerStore.getState().play('z');

    expect(usePlayerStore.getState().currentId).toBe('a');
  });

  it('pauses and resumes the current track', () => {
    start(['a'], 'a');

    usePlayerStore.getState().setPlaying(false);
    expect(usePlayerStore.getState().isPlaying).toBe(false);

    usePlayerStore.getState().setPlaying(true);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('ignores a play state with no current track', () => {
    usePlayerStore.getState().setPlaying(true);

    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});

describe('the transport', () => {
  it('moves next and starts the entry it lands on', () => {
    start(['a', 'b', 'c'], 'a');
    usePlayerStore.getState().setPlaying(false);

    usePlayerStore.getState().skipNext();

    expect(usePlayerStore.getState().currentId).toBe('b');
    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
  });

  it('does nothing at the last entry', () => {
    start(['a', 'b'], 'b');
    usePlayerStore.getState().setPlaying(false);
    usePlayerStore.getState().setPosition(12);

    usePlayerStore.getState().skipNext();

    expect(usePlayerStore.getState().currentId).toBe('b');
    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(usePlayerStore.getState().positionSeconds).toBe(12);
  });

  it('moves previous early in a track', () => {
    start(['a', 'b', 'c'], 'b');
    usePlayerStore.getState().setPosition(4);

    usePlayerStore.getState().skipPrevious();

    expect(usePlayerStore.getState().currentId).toBe('a');
    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
  });

  it('restarts the current track past the grace window', () => {
    start(['a', 'b', 'c'], 'b');
    usePlayerStore.getState().setPosition(6);

    usePlayerStore.getState().skipPrevious();

    expect(usePlayerStore.getState().currentId).toBe('b');
    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
  });

  it('restarts the first entry rather than moving before it', () => {
    start(['a', 'b'], 'a');
    usePlayerStore.getState().setPosition(9);

    usePlayerStore.getState().skipPrevious();

    expect(usePlayerStore.getState().currentId).toBe('a');
    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
  });
});

describe('the shuffle flag', () => {
  it('starts a shuffled queue on its leader with every track once', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    start(['a', 'b', 'c', 'd'], 'c', true);

    const state = usePlayerStore.getState();

    expect(state.shuffle).toBe(true);
    expect(state.queue[0]).toBe('c');
    expect([...state.queue].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(state.sourceQueue).toEqual(['a', 'b', 'c', 'd']);
  });

  it('restores the playlist order and keeps the playhead when turned off', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    start(['a', 'b', 'c', 'd'], 'b', true);

    usePlayerStore.getState().setShuffle(false);

    const state = usePlayerStore.getState();

    expect(state.shuffle).toBe(false);
    expect(state.queue).toEqual(['a', 'b', 'c', 'd']);
    expect(state.currentId).toBe('b');
  });

  it('draws a new leader when turned on', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    start(['a', 'b', 'c'], 'c');

    usePlayerStore.getState().setShuffle(true);

    const state = usePlayerStore.getState();

    expect(state.shuffle).toBe(true);
    expect(state.currentId).toBe('a');
    expect([...state.queue].sort()).toEqual(['a', 'b', 'c']);
  });

  it('clears the shuffle with the queue', () => {
    start(['a', 'b'], 'a', true);

    usePlayerStore.getState().clear();

    const state = usePlayerStore.getState();

    expect(state.shuffle).toBe(false);
    expect(state.sourceQueue).toEqual([]);
    expect(state.playlistName).toBeNull();
    expect(state.tracks).toEqual({});
    expect(state.isPlaying).toBe(false);
    expect(state.positionSeconds).toBe(0);
  });
});
