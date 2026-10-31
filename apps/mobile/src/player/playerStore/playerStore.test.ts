import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { usePlayerStore } from './playerStore';

function start(
  queue: readonly string[],
  currentId: string,
  shuffle = false
): void {
  usePlayerStore.getState().start(queue, 'playlist-1', currentId, shuffle);
}

beforeEach(() => {
  jest.restoreAllMocks();
  usePlayerStore.getState().clear();
});

describe('the player store', () => {
  it('advances to the next track', () => {
    start(['a', 'b', 'c'], 'a');

    usePlayerStore.getState().advance();

    expect(usePlayerStore.getState().currentId).toBe('b');
  });

  it('ends the queue after the last track', () => {
    start(['a', 'b'], 'b');

    usePlayerStore.getState().advance();

    expect(usePlayerStore.getState().currentId).toBeNull();
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

    usePlayerStore.getState().play('c');

    expect(usePlayerStore.getState().queue).toEqual(['a', 'b', 'c']);
    expect(usePlayerStore.getState().currentId).toBe('c');
  });

  it('leaves the queue when the playhead is not in it', () => {
    start(['a', 'b'], 'a');

    usePlayerStore.getState().play('z');

    expect(usePlayerStore.getState().currentId).toBe('a');
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
  });
});
