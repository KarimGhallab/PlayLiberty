import { describe, expect, it } from 'vitest';

import { TrackFileStatus, TrackSourceStatus } from '@playliberty/contracts';

import { trackTone } from '../tones/tones.js';
import { TrackTone } from '../types.js';

const FILE_STATUSES = [
  TrackFileStatus.Pending,
  TrackFileStatus.Downloading,
  TrackFileStatus.Stored,
  TrackFileStatus.Failed,
  TrackFileStatus.Unavailable
] as const;

describe('trackTone', () => {
  it('maps each file status to its own tone while the source is available', () => {
    expect(
      trackTone(TrackFileStatus.Pending, TrackSourceStatus.Available)
    ).toBe(TrackTone.Pending);
    expect(
      trackTone(TrackFileStatus.Downloading, TrackSourceStatus.Available)
    ).toBe(TrackTone.Downloading);
    expect(trackTone(TrackFileStatus.Stored, TrackSourceStatus.Available)).toBe(
      TrackTone.Stored
    );
    expect(trackTone(TrackFileStatus.Failed, TrackSourceStatus.Available)).toBe(
      TrackTone.Failed
    );
    expect(
      trackTone(TrackFileStatus.Unavailable, TrackSourceStatus.Available)
    ).toBe(TrackTone.Unavailable);
  });

  it('gives a removed source the removed tone whatever the file says', () => {
    for (const fileStatus of FILE_STATUSES) {
      expect(trackTone(fileStatus, TrackSourceStatus.Removed)).toBe(
        TrackTone.Removed
      );
    }
  });
});
