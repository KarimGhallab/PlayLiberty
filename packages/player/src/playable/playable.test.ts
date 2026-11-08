import { describe, expect, it } from 'vitest';

import { TrackFileStatus } from '@playliberty/contracts';

import { hasPlayableTrack, isPlayable } from './playable.js';

describe('isPlayable', () => {
  it('plays a stored file', () => {
    expect(isPlayable({ fileStatus: TrackFileStatus.Stored })).toBe(true);
  });

  it('refuses every file status that is not stored', () => {
    for (const fileStatus of [
      TrackFileStatus.Pending,
      TrackFileStatus.Downloading,
      TrackFileStatus.Failed,
      TrackFileStatus.Unavailable
    ]) {
      expect(isPlayable({ fileStatus })).toBe(false);
    }
  });
});

describe('hasPlayableTrack', () => {
  const counts = (stored: number) => ({
    [TrackFileStatus.Pending]: 0,
    [TrackFileStatus.Downloading]: 0,
    [TrackFileStatus.Stored]: stored,
    [TrackFileStatus.Failed]: 0,
    [TrackFileStatus.Unavailable]: 0
  });

  it('plays a playlist with a stored file', () => {
    expect(hasPlayableTrack({ counts: counts(1) })).toBe(true);
  });

  it('refuses a playlist with no stored file', () => {
    expect(hasPlayableTrack({ counts: counts(0) })).toBe(false);
  });
});
