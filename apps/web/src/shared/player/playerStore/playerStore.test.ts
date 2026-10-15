import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  currentIndex,
  currentTrack,
  hasNext,
  nextIndex,
  queuePlaylistId
} from '../types';
import type { PlayerTrack } from '../types';
import { usePlayerStore } from './playerStore';

const PLAYLIST = 'playlist-1';
const OTHER = 'playlist-2';

function track(id: string, playlistId = PLAYLIST): PlayerTrack {
  return {
    id,
    title: id,
    playlistId,
    playlistName: 'The Queue Playlist',
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adopts the read's order while the queue is unshuffled", () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    usePlayerStore.getState().applyRefetch(PLAYLIST, [second, first, third]);

    expect(usePlayerStore.getState().queue.map(item => item.id)).toEqual([
      'track-2',
      'track-1',
      'track-3'
    ]);
    expect(usePlayerStore.getState().currentId).toBe('track-1');
  });

  it('keeps a shuffled queue in its own order across the same read', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], first.id, true);

    const shuffled = usePlayerStore.getState().queue.map(item => item.id);

    usePlayerStore.getState().applyRefetch(PLAYLIST, [third, second, first]);

    expect(usePlayerStore.getState().queue.map(item => item.id)).toEqual(
      shuffled
    );
    expect(usePlayerStore.getState().sourceQueue.map(item => item.id)).toEqual([
      'track-3',
      'track-2',
      'track-1'
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

describe('the queue derivations', () => {
  it('names the queue playlist, and nothing when the queue is empty', () => {
    expect(queuePlaylistId(usePlayerStore.getState())).toBeNull();

    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    expect(queuePlaylistId(usePlayerStore.getState())).toBe(PLAYLIST);

    usePlayerStore.getState().startQueue(OTHER, [elsewhere], elsewhere.id);
    expect(queuePlaylistId(usePlayerStore.getState())).toBe(OTHER);
  });

  it('derives the current track from the id against the queue', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], second.id);

    expect(currentTrack(usePlayerStore.getState())?.id).toBe('track-2');

    usePlayerStore.getState().remove(second.id);
    expect(currentTrack(usePlayerStore.getState())).toBeNull();
  });

  it('has a next everywhere but the last entry, and nowhere with no cursor', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);

    expect(hasNext(usePlayerStore.getState())).toBe(true);
    expect(nextIndex(usePlayerStore.getState())).toBe(1);

    usePlayerStore.getState().skipNext();
    expect(hasNext(usePlayerStore.getState())).toBe(false);
    expect(nextIndex(usePlayerStore.getState())).toBe(-1);

    usePlayerStore.getState().clear();
    expect(hasNext(usePlayerStore.getState())).toBe(false);
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
      sourceQueue: [first],
      currentId: first.id,
      positionSeconds: 12,
      volume: 0.5
    });

    expect(usePlayerStore.getState().queue).toEqual([first]);
    expect(usePlayerStore.getState().currentId).toBe(first.id);
    expect(usePlayerStore.getState().positionSeconds).toBe(12);
    expect(usePlayerStore.getState().volume).toBe(0.5);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});

describe('transport', () => {
  it('moves one place forward and back within the queue', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], first.id);

    usePlayerStore.getState().skipNext();
    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(usePlayerStore.getState().positionSeconds).toBe(0);

    usePlayerStore.getState().skipPrevious();
    expect(usePlayerStore.getState().currentId).toBe('track-1');
  });

  it('steps back inside the grace window and restarts after it', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], third.id);

    usePlayerStore.getState().setPosition(3);
    usePlayerStore.getState().skipPrevious();
    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
    expect(usePlayerStore.getState().seekTo).toBeNull();

    usePlayerStore.getState().setPosition(5);
    usePlayerStore.getState().skipPrevious();
    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
    expect(usePlayerStore.getState().seekTo).toBe(0);
  });

  it('resumes a paused queue when the transport steps or restarts', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], second.id);
    usePlayerStore.getState().setPlaying(false);

    usePlayerStore.getState().skipNext();
    expect(usePlayerStore.getState().currentId).toBe('track-3');
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    usePlayerStore.getState().setPlaying(false);
    usePlayerStore.getState().skipPrevious();
    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    usePlayerStore.getState().setPlaying(false);
    usePlayerStore.getState().setPosition(30);
    usePlayerStore.getState().skipPrevious();
    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('restarts the first track because there is nothing behind it', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    usePlayerStore.getState().setPosition(3);

    usePlayerStore.getState().skipPrevious();

    expect(usePlayerStore.getState().currentId).toBe('track-1');
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
    expect(usePlayerStore.getState().seekTo).toBe(0);
  });

  it('does nothing when no track is current', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    usePlayerStore.getState().remove(first.id);

    usePlayerStore.getState().skipPrevious();

    expect(usePlayerStore.getState().currentId).toBeNull();
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
  });

  it('stops at the end rather than wrapping forward', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], second.id);

    usePlayerStore.getState().skipNext();

    expect(usePlayerStore.getState().currentId).toBe('track-2');
  });

  it('stops at the end of the queue instead of looping', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], second.id);
    usePlayerStore.getState().setPosition(190);

    usePlayerStore.getState().advance();

    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(usePlayerStore.getState().positionSeconds).toBe(0);
  });

  it('advances to the next track when a finished track has one', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);

    usePlayerStore.getState().advance();

    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('clears the resume offset when skipping to another track', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    usePlayerStore.getState().setPosition(90);

    usePlayerStore.getState().skipNext();

    expect(usePlayerStore.getState().positionSeconds).toBe(0);
  });

  it('keeps pause and resume on the same place', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    usePlayerStore.getState().setPosition(45);

    usePlayerStore.getState().setPlaying(false);
    expect(usePlayerStore.getState().positionSeconds).toBe(45);

    usePlayerStore.getState().setPlaying(true);
    expect(usePlayerStore.getState().positionSeconds).toBe(45);
  });
});

describe('shuffle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('draws a new order and starts on the random leading track', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], second.id);
    /* The draw picks the third entry, so the leader is a fresh track rather than
     * the one already playing. */
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    usePlayerStore.getState().setShuffle(true);

    const state = usePlayerStore.getState();

    expect(state.shuffle).toBe(true);
    expect(state.currentId).toBe('track-3');
    expect(state.queue[0].id).toBe('track-3');
    expect(state.positionSeconds).toBe(0);
    expect(state.isPlaying).toBe(true);
    expect(new Set(state.queue.map(track => track.id))).toEqual(
      new Set(['track-1', 'track-2', 'track-3'])
    );
  });

  it('walks a shuffled queue in its own order and stops at its end', () => {
    const a = track('a');
    const b = track('b');
    const c = track('c');
    const d = track('d');
    const e = track('e');

    /* A fixed order, set directly so the walk is asserted rather than sampled:
     * the shuffle under test is the queue's order, not the draw that made it. */
    usePlayerStore.setState({
      queue: [d, c, a, e, b],
      sourceQueue: [a, b, c, d, e],
      currentId: 'd',
      isPlaying: true,
      shuffle: true
    });

    const walked: string[] = [];

    for (let step = 0; step < 5; step += 1) {
      usePlayerStore.getState().skipNext();
      walked.push(usePlayerStore.getState().currentId ?? 'stopped');
    }

    expect(walked).toEqual(['c', 'a', 'e', 'b', 'b']);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('stops rather than re-rolling at the end of a shuffled queue', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], second.id);
    /* The draw picks the second entry, so the shuffled queue is the two entries
     * in that order and its end is the first one. */
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    usePlayerStore.getState().setShuffle(true);

    usePlayerStore.getState().skipNext();

    expect(usePlayerStore.getState().queue.map(item => item.id)).toEqual([
      'track-2',
      'track-1'
    ]);

    usePlayerStore.getState().skipNext();

    expect(usePlayerStore.getState().currentId).toBe('track-1');
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('clears the shuffle with the queue', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    usePlayerStore.getState().setShuffle(true);

    usePlayerStore.getState().clear();

    expect(usePlayerStore.getState().shuffle).toBe(false);
  });

  it('scatters the whole playlist behind the drawn leader', () => {
    const a = track('a');
    const b = track('b');
    const c = track('c');
    const d = track('d');
    const e = track('e');

    /* Playing D, in the order A B C D E; the draw picks E, so the leader is a
     * track other than the one already playing. */
    usePlayerStore.getState().startQueue(PLAYLIST, [a, b, c, d, e], d.id);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    usePlayerStore.getState().setShuffle(true);

    const state = usePlayerStore.getState();

    expect(state.currentId).toBe('e');
    expect(state.queue[0].id).toBe('e');
    expect(state.queue).toHaveLength(5);
    expect(new Set(state.queue.map(item => item.id))).toEqual(
      new Set(['a', 'b', 'c', 'd', 'e'])
    );

    expect(state.queue.slice(1).map(item => item.id)).not.toContain('e');
    expect(state.sourceQueue.map(item => item.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e'
    ]);
  });

  it('puts the queue back in the playlist order and keeps the drawn playhead when the shuffle is turned off', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], second.id);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    usePlayerStore.getState().setShuffle(true);

    expect(usePlayerStore.getState().currentId).toBe('track-3');

    usePlayerStore.getState().setShuffle(false);

    const state = usePlayerStore.getState();

    expect(state.shuffle).toBe(false);
    expect(state.queue.map(item => item.id)).toEqual([
      'track-1',
      'track-2',
      'track-3'
    ]);
    expect(state.currentId).toBe('track-3');
  });

  it('builds a shuffled queue led by the pressed track', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], second.id, true);

    const state = usePlayerStore.getState();

    expect(state.shuffle).toBe(true);
    expect(state.currentId).toBe('track-2');
    expect(state.queue[0].id).toBe('track-2');
    expect(state.queue).toHaveLength(3);
    expect(state.queue.map(item => item.id)).toContain('track-1');
    expect(state.queue.map(item => item.id)).toContain('track-3');
  });

  it('keeps the playlist order beside every queue change', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], first.id);

    expect(usePlayerStore.getState().sourceQueue.map(item => item.id)).toEqual([
      'track-1',
      'track-2',
      'track-3'
    ]);

    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    usePlayerStore.getState().setShuffle(true);

    expect(usePlayerStore.getState().sourceQueue.map(item => item.id)).toEqual([
      'track-1',
      'track-2',
      'track-3'
    ]);
    expect(usePlayerStore.getState().queue[0].id).toBe(
      usePlayerStore.getState().currentId
    );
  });

  it('takes a track that arrived while shuffled into the source order', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    usePlayerStore.getState().setShuffle(true);

    usePlayerStore.getState().applyRefetch(PLAYLIST, [first, second, third]);

    expect(usePlayerStore.getState().sourceQueue.map(item => item.id)).toEqual([
      'track-1',
      'track-2',
      'track-3'
    ]);

    usePlayerStore.getState().setShuffle(false);

    expect(usePlayerStore.getState().queue.map(item => item.id)).toEqual([
      'track-1',
      'track-2',
      'track-3'
    ]);
  });
});

describe('dropAndAdvance', () => {
  it('drops the current track and continues on the next one', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], second.id);

    usePlayerStore.getState().dropAndAdvance(second.id);

    const state = usePlayerStore.getState();

    expect(state.queue.map(track => track.id)).toEqual(['track-1', 'track-3']);
    expect(state.currentId).toBe('track-3');
    expect(state.isPlaying).toBe(true);
    expect(state.positionSeconds).toBe(0);
  });

  it('stops when the dropped track was the last one', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], second.id);

    usePlayerStore.getState().dropAndAdvance(second.id);

    const state = usePlayerStore.getState();

    expect(state.queue.map(track => track.id)).toEqual(['track-1']);
    expect(state.currentId).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.positionSeconds).toBe(0);
  });

  it('only removes a track that is not current, leaving the playhead alone', () => {
    usePlayerStore
      .getState()
      .startQueue(PLAYLIST, [first, second, third], second.id);

    usePlayerStore.getState().dropAndAdvance(first.id);

    const state = usePlayerStore.getState();

    expect(state.queue.map(track => track.id)).toEqual(['track-2', 'track-3']);
    expect(state.currentId).toBe('track-2');
    expect(state.isPlaying).toBe(true);
  });
});

describe('seek', () => {
  it('writes the position and asks the element to move, then clears the ask', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);

    usePlayerStore.getState().seek(120);

    expect(usePlayerStore.getState().positionSeconds).toBe(120);
    expect(usePlayerStore.getState().seekTo).toBe(120);

    usePlayerStore.getState().clearSeek();
    expect(usePlayerStore.getState().seekTo).toBeNull();
  });

  it('never seeks before zero', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);

    usePlayerStore.getState().seek(-30);

    expect(usePlayerStore.getState().positionSeconds).toBe(0);
    expect(usePlayerStore.getState().seekTo).toBe(0);
  });

  it('does not raise a seek request when the position is reported back', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);

    usePlayerStore.getState().setPosition(30);

    expect(usePlayerStore.getState().positionSeconds).toBe(30);
    expect(usePlayerStore.getState().seekTo).toBeNull();
  });
});

describe('volume', () => {
  it('clamps the volume and refuses a non-number', () => {
    usePlayerStore.getState().setVolume(1.5);
    expect(usePlayerStore.getState().volume).toBe(1);

    usePlayerStore.getState().setVolume(-0.2);
    expect(usePlayerStore.getState().volume).toBe(0);

    usePlayerStore.getState().setVolume(Number.NaN);
    expect(usePlayerStore.getState().volume).toBe(1);
  });
});
