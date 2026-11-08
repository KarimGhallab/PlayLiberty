import { describe, expect, it } from 'vitest';

import {
  REMOTE_REMOVED,
  TrackFileStatus
} from '@playliberty/contracts';
import type { TrackFileStatusCounts } from '@playliberty/contracts';

import {
  STATUS_CHIPS,
  TRACK_STATUS_CHIPS,
  statusCount,
  totalStatusCount,
  visibleStatusChips
} from './statusChips.js';

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

describe('the status table', () => {
  it('names the five file states in their fixed order', () => {
    expect(TRACK_STATUS_CHIPS.map(chip => chip.value)).toEqual([
      TrackFileStatus.Stored,
      TrackFileStatus.Pending,
      TrackFileStatus.Downloading,
      TrackFileStatus.Failed,
      TrackFileStatus.Unavailable
    ]);
  });

  it('puts the retained view last', () => {
    expect(STATUS_CHIPS.at(-1)?.value).toBe(REMOTE_REMOVED);
  });

  it('sums the five file states, never the retained figure', () => {
    expect(totalStatusCount(counts({ stored: 2, failed: 1 }))).toBe(3);
    expect(statusCount(REMOTE_REMOVED, counts({ stored: 2 }), 2)).toBe(2);
    expect(statusCount(TrackFileStatus.Stored, counts({ stored: 2 }), 2)).toBe(
      2
    );
  });

  it('hides a state with nothing in it, keeping the one in force', () => {
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

  it('draws the retained view last, only while it holds a track', () => {
    expect(
      visibleStatusChips(counts({ stored: 2 }), 2, null).map(chip => chip.value)
    ).toEqual([TrackFileStatus.Stored, REMOTE_REMOVED]);
    expect(
      visibleStatusChips(counts({ stored: 2 }), 0, REMOTE_REMOVED).map(
        chip => chip.value
      )
    ).toEqual([TrackFileStatus.Stored]);
  });
});
