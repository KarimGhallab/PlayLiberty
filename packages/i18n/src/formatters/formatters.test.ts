import { describe, expect, it } from 'vitest';

import {
  PlaylistSyncStatus,
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';

import { catalogs } from '../catalogs.js';
import { createTranslator } from '../createTranslator/createTranslator.js';
import { Language } from '../types.js';
import {
  formatDuration,
  formatLastSynced,
  formatRelativeTime,
  formatTrackCount,
  providerLabel,
  syncStateLabel,
  trackCountUnit,
  trackStateLabel
} from './formatters.js';

const t = createTranslator(catalogs[Language.English], Language.English);

const now = new Date('2026-10-01T12:00:00.000Z');

function before(milliseconds: number): Date {
  return new Date(now.getTime() - milliseconds);
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatDuration', () => {
  it('renders minutes and seconds below an hour', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(59)).toBe('0:59');
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(258)).toBe('4:18');
    expect(formatDuration(3599)).toBe('59:59');
  });

  it('pads the minute once it passes an hour', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(7325)).toBe('2:02:05');
  });

  it('floors a fractional duration and clamps a negative one', () => {
    expect(formatDuration(12.9)).toBe('0:12');
    expect(formatDuration(-5)).toBe('0:00');
  });
});

describe('formatRelativeTime', () => {
  it('says just now under a minute, including a future timestamp', () => {
    expect(formatRelativeTime(t, now, now)).toBe('just now');
    expect(formatRelativeTime(t, before(30 * SECOND), now)).toBe('just now');
    expect(formatRelativeTime(t, new Date(now.getTime() + 5000), now)).toBe(
      'just now'
    );
  });

  it('counts minutes and hours, singular at one', () => {
    expect(formatRelativeTime(t, before(MINUTE), now)).toBe('1 minute ago');
    expect(formatRelativeTime(t, before(2 * MINUTE), now)).toBe(
      '2 minutes ago'
    );
    expect(formatRelativeTime(t, before(59 * MINUTE), now)).toBe(
      '59 minutes ago'
    );
    expect(formatRelativeTime(t, before(HOUR), now)).toBe('1 hour ago');
    expect(formatRelativeTime(t, before(23 * HOUR), now)).toBe('23 hours ago');
  });

  it('has a word for the one day and counts the rest', () => {
    expect(formatRelativeTime(t, before(DAY), now)).toBe('yesterday');
    expect(formatRelativeTime(t, before(47 * HOUR), now)).toBe('yesterday');
    expect(formatRelativeTime(t, before(2 * DAY), now)).toBe('2 days ago');
    expect(formatRelativeTime(t, before(6 * DAY), now)).toBe('6 days ago');
  });

  it('counts weeks, months and years', () => {
    expect(formatRelativeTime(t, before(7 * DAY), now)).toBe('1 week ago');
    expect(formatRelativeTime(t, before(20 * DAY), now)).toBe('2 weeks ago');
    expect(formatRelativeTime(t, before(3 * 7 * DAY), now)).toBe('3 weeks ago');
    expect(formatRelativeTime(t, before(35 * DAY), now)).toBe('1 month ago');
    expect(formatRelativeTime(t, before(364 * DAY), now)).toBe('1 year ago');
    expect(formatRelativeTime(t, before(730 * DAY), now)).toBe('2 years ago');
  });
});

describe('formatLastSynced', () => {
  it('names the timer with the state word', () => {
    expect(formatLastSynced(t, before(2 * DAY), now)).toBe('Synced 2 days ago');
    expect(formatLastSynced(t, before(DAY), now)).toBe('Synced yesterday');
    expect(formatLastSynced(t, now, now)).toBe('Synced just now');
  });

  it('says never while the timestamp is null', () => {
    expect(formatLastSynced(t, null, now)).toBe('Never synced');
  });
});

describe('syncStateLabel', () => {
  it('names the three states', () => {
    expect(syncStateLabel(t, PlaylistSyncStatus.Syncing)).toBe('Syncing');
    expect(syncStateLabel(t, PlaylistSyncStatus.Error)).toBe('Sync failed');
    expect(syncStateLabel(t, PlaylistSyncStatus.Idle)).toBe('Up to date');
  });
});

describe('formatTrackCount', () => {
  it('pluralises at one and takes no thousands separator', () => {
    expect(formatTrackCount(t, 0)).toBe('0 tracks');
    expect(formatTrackCount(t, 1)).toBe('1 track');
    expect(formatTrackCount(t, 2)).toBe('2 tracks');
    expect(formatTrackCount(t, 1284)).toBe('1284 tracks');
  });
});

describe('trackCountUnit', () => {
  it('is singular only at one', () => {
    expect(trackCountUnit(t, 0)).toBe('tracks');
    expect(trackCountUnit(t, 1)).toBe('track');
    expect(trackCountUnit(t, 5)).toBe('tracks');
  });
});

describe('trackStateLabel', () => {
  it('says nothing for a stored track that is still available', () => {
    expect(
      trackStateLabel(
        t,
        TrackFileStatus.Stored,
        TrackSourceStatus.Available,
        Provider.Youtube
      )
    ).toBeNull();
  });

  it('names each file state that is not stored', () => {
    expect(
      trackStateLabel(
        t,
        TrackFileStatus.Pending,
        TrackSourceStatus.Available,
        Provider.Youtube
      )
    ).toBe('Pending');
    expect(
      trackStateLabel(
        t,
        TrackFileStatus.Downloading,
        TrackSourceStatus.Available,
        Provider.Youtube
      )
    ).toBe('Downloading');
    expect(
      trackStateLabel(
        t,
        TrackFileStatus.Failed,
        TrackSourceStatus.Available,
        Provider.Youtube
      )
    ).toBe('Failed');
    expect(
      trackStateLabel(
        t,
        TrackFileStatus.Unavailable,
        TrackSourceStatus.Available,
        Provider.Youtube
      )
    ).toBe('Unavailable');
  });

  it('names the source for a removed track, whatever the file', () => {
    expect(
      trackStateLabel(
        t,
        TrackFileStatus.Stored,
        TrackSourceStatus.Removed,
        Provider.Youtube
      )
    ).toBe('Removed from YouTube');
    expect(
      trackStateLabel(
        t,
        TrackFileStatus.Failed,
        TrackSourceStatus.Removed,
        Provider.Youtube
      )
    ).toBe('Removed from YouTube');
    expect(
      trackStateLabel(
        t,
        TrackFileStatus.Unavailable,
        TrackSourceStatus.Removed,
        Provider.Youtube
      )
    ).toBe('Removed from YouTube');
  });

  it('names the provider as a person writes it', () => {
    expect(providerLabel(t, Provider.Youtube)).toBe('YouTube');
  });
});

/*
 * The switch, at the package seam: the formatters read the translator, so the
 * same inputs read in the chosen language. One sync line and one count are
 * pinned, because the ticket names exactly those two.
 */
describe('the chosen language', () => {
  const fr = createTranslator(catalogs[Language.French], Language.French);

  it('reads a sync line and a track count in French', () => {
    expect(formatLastSynced(fr, before(2 * DAY), now)).toBe(
      'Synchronisée il y a 2 jours'
    );
    expect(formatTrackCount(fr, 3)).toBe('3 pistes');
  });
});
