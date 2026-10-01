import { beforeEach, describe, expect, it } from 'vitest';

import { usePlayerStore } from './playerStore';
import type { PlayerTrack } from './types';

const first: PlayerTrack = { id: 'track-1', title: 'First' };
const second: PlayerTrack = { id: 'track-2', title: 'Second' };
const third: PlayerTrack = { id: 'track-3', title: 'Third' };

beforeEach(() => {
  usePlayerStore.getState().clear();
});

describe('usePlayerStore', () => {
  it('enqueues a track once', () => {
    usePlayerStore.getState().enqueue(first);
    usePlayerStore.getState().enqueue(first);

    expect(usePlayerStore.getState().queue).toEqual([first]);
  });

  it('keeps the user order for known ids and appends new ids last', () => {
    usePlayerStore.getState().replaceQueue([first, second]);
    usePlayerStore.getState().replaceQueue([second, first, third]);

    expect(usePlayerStore.getState().queue.map(track => track.id)).toEqual([
      'track-1',
      'track-2',
      'track-3'
    ]);
  });

  it('drops a track the refetch no longer returns', () => {
    usePlayerStore.getState().replaceQueue([first, second]);
    usePlayerStore.getState().replaceQueue([second]);

    expect(usePlayerStore.getState().queue).toEqual([second]);
  });

  it('plays a track and does not reset the position when it is already current', () => {
    usePlayerStore.getState().enqueue(first);
    usePlayerStore.getState().play(first.id);
    expect(usePlayerStore.getState().currentId).toBe(first.id);
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    usePlayerStore.getState().setPosition(30);
    usePlayerStore.getState().play(first.id);
    expect(usePlayerStore.getState().positionSeconds).toBe(30);
  });

  it('clears the current track when it is removed and keeps it otherwise', () => {
    usePlayerStore.getState().replaceQueue([first, second]);
    usePlayerStore.getState().play(first.id);
    usePlayerStore.getState().remove(second.id);
    expect(usePlayerStore.getState().currentId).toBe(first.id);

    usePlayerStore.getState().remove(first.id);
    expect(usePlayerStore.getState().currentId).toBeNull();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('hydrates the persisted slice without autoplay', () => {
    usePlayerStore.getState().hydrate({
      queue: [first],
      currentId: first.id,
      positionSeconds: 12
    });

    expect(usePlayerStore.getState().queue).toEqual([first]);
    expect(usePlayerStore.getState().currentId).toBe(first.id);
    expect(usePlayerStore.getState().positionSeconds).toBe(12);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});
