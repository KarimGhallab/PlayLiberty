import { beforeEach, describe, expect, it } from 'vitest';

import { usePlayerStore } from './playerStore';
import { currentIndex } from './types';
import type { PlayerTrack } from './types';

const PLAYLIST = 'playlist-1';
const OTHER = 'playlist-2';

function track(id: string, playlistId = PLAYLIST): PlayerTrack {
  return {
    id,
    title: id,
    playlistId,
    durationSeconds: 180,
    thumbnailPath: null
  };
}

const first = track('track-1');
const second = track('track-2');
const third = track('track-3');
const elsewhere = track('track-9', OTHER);

beforeEach(() => {
  usePlayerStore.getState().clear();
});

describe('startQueue', () => {
  it('builds the queue from the playlist in order, starting at the pressed track', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], second.id);

    expect(usePlayerStore.getState().queue.map(item => item.id)).toEqual([
      'track-1',
      'track-2',
      'track-3'
    ]);
    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('replaces the queue when a track in another playlist is played', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    usePlayerStore.getState().startQueue(OTHER, [elsewhere], elsewhere.id);

    expect(usePlayerStore.getState().queue).toEqual([elsewhere]);
    expect(usePlayerStore.getState().queue[0].playlistId).toBe(OTHER);
    expect(usePlayerStore.getState().currentId).toBe('track-9');
  });

  it('records the playlist on every entry so the bar can name the source', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);

    expect(
      usePlayerStore
        .getState()
        .queue.every(item => item.playlistId === PLAYLIST)
    ).toBe(true);
  });

  it('starts with nothing when the pressed track is not in the list', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], 'absent');

    expect(usePlayerStore.getState().queue).toEqual([]);
    expect(usePlayerStore.getState().currentId).toBeNull();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('ignores tracks that belong to another playlist', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, elsewhere], first.id);

    expect(usePlayerStore.getState().queue).toEqual([first]);
  });
});

describe('applyRefetch', () => {
  it('keeps the built order for known ids and appends new ids last', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    usePlayerStore.getState().applyRefetch(PLAYLIST, [second, first, third]);

    expect(usePlayerStore.getState().queue.map(item => item.id)).toEqual([
      'track-1',
      'track-2',
      'track-3'
    ]);
  });

  it('drops a track the refetch no longer returns', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    usePlayerStore.getState().applyRefetch(PLAYLIST, [second]);

    expect(usePlayerStore.getState().queue.map(item => item.id)).toEqual([
      'track-2'
    ]);
  });

  it('does not move the current track or the offset when the order changes', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], second.id);
    usePlayerStore.getState().setPosition(42);

    usePlayerStore.getState().applyRefetch(PLAYLIST, [third, first, second]);

    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(usePlayerStore.getState().positionSeconds).toBe(42);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('leaves the offset alone when a track before the current one is dropped', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], third.id);
    usePlayerStore.getState().setPosition(30);

    usePlayerStore.getState().applyRefetch(PLAYLIST, [second, third]);

    expect(usePlayerStore.getState().currentId).toBe('track-3');
    expect(usePlayerStore.getState().positionSeconds).toBe(30);
  });

  it('clears the cursor when the current track itself is dropped', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], second.id);

    usePlayerStore.getState().applyRefetch(PLAYLIST, [first]);

    expect(usePlayerStore.getState().currentId).toBeNull();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('is not this queue when the refetch is another playlist', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    usePlayerStore.getState().applyRefetch(OTHER, [elsewhere]);

    expect(usePlayerStore.getState().queue.map(item => item.id)).toEqual([
      'track-1',
      'track-2'
    ]);
  });
});

describe('play', () => {
  it('plays a track and does not reset the position when it is already current', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    expect(usePlayerStore.getState().currentId).toBe(first.id);
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    usePlayerStore.getState().setPosition(30);
    usePlayerStore.getState().play(first.id);
    expect(usePlayerStore.getState().positionSeconds).toBe(30);
  });

  it('refuses to play a track that is not in the queue', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    usePlayerStore.getState().play('absent');

    expect(usePlayerStore.getState().currentId).toBe(first.id);
  });
});

describe('currentIndex', () => {
  it('is the position of the current track, and -1 with no cursor', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], second.id);

    expect(currentIndex(usePlayerStore.getState())).toBe(1);

    usePlayerStore.getState().clear();
    expect(currentIndex(usePlayerStore.getState())).toBe(-1);
  });
});

describe('remove', () => {
  it('clears the current track when it is removed and keeps it otherwise', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    usePlayerStore.getState().remove(second.id);
    expect(usePlayerStore.getState().currentId).toBe(first.id);

    usePlayerStore.getState().remove(first.id);
    expect(usePlayerStore.getState().currentId).toBeNull();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});

describe('hydrate', () => {
  it('restores the queue and offset without autoplay', () => {
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
