import { describe, expect, it, vi } from 'vitest';

import type { PlaylistTrack } from '@playliberty/contracts';
import {
  AssociationOrigin,
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';

import {
  PREVIOUS_GRACE_SECONDS,
  mergeIds,
  orderTracksByQueue,
  previousMove,
  randomItem,
  shuffleIds
} from './queue.js';

function association(trackId: string): PlaylistTrack {
  return {
    track: {
      id: trackId,
      provider: Provider.Youtube,
      videoId: trackId,
      title: trackId,
      durationSeconds: null,
      skipNonMusic: false,
      thumbnailPath: null,
      fileStatus: TrackFileStatus.Stored,
      sourceStatus: TrackSourceStatus.Available,
      lastCheckedAt: null,
      createdAt: '2026-11-06T00:00:00.000Z',
      updatedAt: '2026-11-06T00:00:00.000Z'
    },
    origin: AssociationOrigin.Remote,
    position: 0
  } as PlaylistTrack;
}

describe('randomItem', () => {
  it('draws nothing from an empty list', () => {
    expect(randomItem([])).toBeUndefined();
  });

  it('draws an entry by the random index', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(randomItem(['a', 'b', 'c'])).toBe('b');
    vi.restoreAllMocks();
  });
});

describe('shuffleIds', () => {
  it('hoists the leader and keeps every id', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    const shuffled = shuffleIds(['a', 'b', 'c', 'd'], 'c');

    expect(shuffled[0]).toBe('c');
    expect([...shuffled].sort()).toEqual(['a', 'b', 'c', 'd']);
    vi.restoreAllMocks();
  });

  it('scatters every id when the leader is not in the queue', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    const shuffled = shuffleIds(['a', 'b', 'c'], 'x');

    expect([...shuffled].sort()).toEqual(['a', 'b', 'c']);
    vi.restoreAllMocks();
  });
});

describe('mergeIds', () => {
  it('keeps the current order for known ids, appends new ones and drops a missing one', () => {
    expect(mergeIds(['b', 'a', 'gone'], ['a', 'c', 'b'])).toEqual([
      'b',
      'a',
      'c'
    ]);
  });
});

describe('orderTracksByQueue', () => {
  const tracks = ['a', 'b', 'c', 'd'].map(association);

  it('orders rows by their queue group', () => {
    expect(
      orderTracksByQueue(tracks, ['a', 'c', 'b', 'd']).map(
        row => row.track.id
      )
    ).toEqual(['a', 'c', 'b', 'd']);
  });

  it('keeps a row the queue does not carry beside its playlist neighbour', () => {
    expect(
      orderTracksByQueue(tracks, ['b', 'c']).map(row => row.track.id)
    ).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('previousMove', () => {
  it('steps back inside the grace window', () => {
    expect(previousMove(1, PREVIOUS_GRACE_SECONDS - 0.001)).toBe('previous');
  });

  it('restarts at the boundary, past it, and on the first track', () => {
    expect(previousMove(1, PREVIOUS_GRACE_SECONDS)).toBe('restart');
    expect(previousMove(1, PREVIOUS_GRACE_SECONDS + 1)).toBe('restart');
    expect(previousMove(0, 1)).toBe('restart');
  });

  it('does nothing without a current index', () => {
    expect(previousMove(-1, 0)).toBeNull();
  });
});
