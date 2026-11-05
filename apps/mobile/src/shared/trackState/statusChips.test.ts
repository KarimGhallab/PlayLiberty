import { describe, expect, it } from '@jest/globals';

import { REMOTE_REMOVED, TrackFileStatus } from '@playliberty/contracts';
import type { TrackFileStatusCounts } from '@playliberty/contracts';

import {
  statusCount,
  totalStatusCount,
  visibleStatusChips
} from './statusChips';

function counts(
  overrides: Partial<TrackFileStatusCounts> = {}
): TrackFileStatusCounts {
  return {
    [TrackFileStatus.Stored]: 0,
    [TrackFileStatus.Pending]: 0,
    [TrackFileStatus.Downloading]: 0,
    [TrackFileStatus.Failed]: 0,
    [TrackFileStatus.Unavailable]: 0,
    ...overrides
  };
}

describe('the status chips', () => {
  it('hides a state with nothing in it', () => {
    const drawn = visibleStatusChips(counts({ stored: 2 }), 0, null);

    expect(drawn.map(chip => chip.value)).toEqual([TrackFileStatus.Stored]);
  });

  it('keeps the state in force even at zero', () => {
    const drawn = visibleStatusChips(
      counts({ stored: 2 }),
      0,
      TrackFileStatus.Failed
    );

    expect(drawn.map(chip => chip.value)).toEqual([
      TrackFileStatus.Stored,
      TrackFileStatus.Failed
    ]);
  });

  it('keeps the states in their fixed order', () => {
    const drawn = visibleStatusChips(
      counts({
        stored: 1,
        failed: 1,
        [TrackFileStatus.Unavailable]: 1
      }),
      0,
      null
    );

    expect(drawn.map(chip => chip.value)).toEqual([
      TrackFileStatus.Stored,
      TrackFileStatus.Failed,
      TrackFileStatus.Unavailable
    ]);
  });

  it('draws the retained view last, only while it holds a track', () => {
    const drawn = visibleStatusChips(counts({ stored: 2 }), 2, null);

    expect(drawn.map(chip => chip.value)).toEqual([
      TrackFileStatus.Stored,
      REMOTE_REMOVED
    ]);
    expect(
      visibleStatusChips(counts({ stored: 2 }), 0, REMOTE_REMOVED).map(
        chip => chip.value
      )
    ).toEqual([TrackFileStatus.Stored]);
  });

  it('counts the retained figure beside the buckets, not inside them', () => {
    const whole = counts({ stored: 2, failed: 1 });

    expect(totalStatusCount(whole)).toBe(3);
    expect(statusCount(REMOTE_REMOVED, whole, 2)).toBe(2);
    expect(statusCount(TrackFileStatus.Stored, whole, 2)).toBe(2);
  });
});
