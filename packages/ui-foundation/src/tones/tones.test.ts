import { describe, expect, it } from 'vitest';

import { TrackFileStatus, TrackSourceStatus } from '@playliberty/contracts';

import { fileTone, trackTone } from '../tones/tones.js';
import { TrackTone } from '../types.js';

const FILE_STATUSES = [
  TrackFileStatus.Pending,
  TrackFileStatus.Downloading,
  TrackFileStatus.Stored,
  TrackFileStatus.Failed,
  TrackFileStatus.Unavailable
] as const;

describe('trackTone', () => {
  it('gives a removed source the removed tone whatever the file says', () => {
    for (const fileStatus of FILE_STATUSES) {
      expect(trackTone(fileStatus, TrackSourceStatus.Removed)).toBe(
        TrackTone.Removed
      );
    }
  });

  it('ignores the source while it is still there', () => {
    expect(trackTone(TrackFileStatus.Stored, TrackSourceStatus.Available)).toBe(
      TrackTone.Stored
    );
  });
});

describe('fileTone', () => {
  it('maps each file status to its own tone while the source is available', () => {
    expect(fileTone(TrackFileStatus.Pending, TrackSourceStatus.Available)).toBe(
      TrackTone.Pending
    );
    expect(
      fileTone(TrackFileStatus.Downloading, TrackSourceStatus.Available)
    ).toBe(TrackTone.Downloading);
    expect(fileTone(TrackFileStatus.Stored, TrackSourceStatus.Available)).toBe(
      TrackTone.Stored
    );
    expect(fileTone(TrackFileStatus.Failed, TrackSourceStatus.Available)).toBe(
      TrackTone.Failed
    );
    expect(
      fileTone(TrackFileStatus.Unavailable, TrackSourceStatus.Available)
    ).toBe(TrackTone.Unavailable);
  });

  it('keeps the file tone when a source is removed before the file was stored', () => {
    expect(
      fileTone(TrackFileStatus.Unavailable, TrackSourceStatus.Removed)
    ).toBe(TrackTone.Unavailable);
    expect(fileTone(TrackFileStatus.Failed, TrackSourceStatus.Removed)).toBe(
      TrackTone.Failed
    );
    expect(fileTone(TrackFileStatus.Pending, TrackSourceStatus.Removed)).toBe(
      TrackTone.Pending
    );
  });

  it('gives a stored track whose source was removed the retained tone', () => {
    expect(fileTone(TrackFileStatus.Stored, TrackSourceStatus.Removed)).toBe(
      TrackTone.Retained
    );
  });
});
