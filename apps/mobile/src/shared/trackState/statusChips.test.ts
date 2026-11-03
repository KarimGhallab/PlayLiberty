import { describe, expect, it } from '@jest/globals';

import { TrackFileStatus } from '@playliberty/contracts';
import type { TrackFileStatusCounts } from '@playliberty/contracts';

import { visibleStatusChips } from './statusChips';

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
    const drawn = visibleStatusChips(counts({ stored: 2 }), null);

    expect(drawn.map(chip => chip.value)).toEqual([TrackFileStatus.Stored]);
  });

  it('keeps the state in force even at zero', () => {
    const drawn = visibleStatusChips(
      counts({ stored: 2 }),
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
      null
    );

    expect(drawn.map(chip => chip.value)).toEqual([
      TrackFileStatus.Stored,
      TrackFileStatus.Failed,
      TrackFileStatus.Unavailable
    ]);
  });
});
