import { beforeEach, describe, expect, it } from '@jest/globals';

import { usePlayerStore } from './playerStore';

function start(queue: readonly string[], currentId: string): void {
  usePlayerStore.getState().start(queue, 'playlist-1', currentId);
}

beforeEach(() => {
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
});
