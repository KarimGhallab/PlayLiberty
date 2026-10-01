import { describe, expect, it } from 'vitest';

import {
  formatDuration,
  formatLastSynced,
  formatRelativeTime,
  formatTrackCount,
  trackCountUnit
} from './formatters.js';

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
    expect(formatRelativeTime(now, now)).toBe('just now');
    expect(formatRelativeTime(before(30 * SECOND), now)).toBe('just now');
    expect(formatRelativeTime(new Date(now.getTime() + 5000), now)).toBe(
      'just now'
    );
  });

  it('counts minutes and hours, singular at one', () => {
    expect(formatRelativeTime(before(MINUTE), now)).toBe('1 minute ago');
    expect(formatRelativeTime(before(2 * MINUTE), now)).toBe('2 minutes ago');
    expect(formatRelativeTime(before(59 * MINUTE), now)).toBe('59 minutes ago');
    expect(formatRelativeTime(before(HOUR), now)).toBe('1 hour ago');
    expect(formatRelativeTime(before(23 * HOUR), now)).toBe('23 hours ago');
  });

  it('has a word for the one day and counts the rest', () => {
    expect(formatRelativeTime(before(DAY), now)).toBe('yesterday');
    expect(formatRelativeTime(before(47 * HOUR), now)).toBe('yesterday');
    expect(formatRelativeTime(before(2 * DAY), now)).toBe('2 days ago');
    expect(formatRelativeTime(before(6 * DAY), now)).toBe('6 days ago');
  });

  it('counts weeks, months and years', () => {
    expect(formatRelativeTime(before(7 * DAY), now)).toBe('1 week ago');
    expect(formatRelativeTime(before(20 * DAY), now)).toBe('2 weeks ago');
    expect(formatRelativeTime(before(3 * 7 * DAY), now)).toBe('3 weeks ago');
    expect(formatRelativeTime(before(35 * DAY), now)).toBe('1 month ago');
    expect(formatRelativeTime(before(364 * DAY), now)).toBe('1 year ago');
    expect(formatRelativeTime(before(730 * DAY), now)).toBe('2 years ago');
  });
});

describe('formatLastSynced', () => {
  it('names the timer with the state word', () => {
    expect(formatLastSynced(before(2 * DAY), now)).toBe('Synced 2 days ago');
    expect(formatLastSynced(before(DAY), now)).toBe('Synced yesterday');
    expect(formatLastSynced(now, now)).toBe('Synced just now');
  });

  it('says never while the timestamp is null', () => {
    expect(formatLastSynced(null, now)).toBe('Never synced');
  });
});

describe('formatTrackCount', () => {
  it('pluralises at one and takes no thousands separator', () => {
    expect(formatTrackCount(0)).toBe('0 tracks');
    expect(formatTrackCount(1)).toBe('1 track');
    expect(formatTrackCount(2)).toBe('2 tracks');
    expect(formatTrackCount(1284)).toBe('1284 tracks');
  });
});

describe('trackCountUnit', () => {
  it('is singular only at one', () => {
    expect(trackCountUnit(0)).toBe('tracks');
    expect(trackCountUnit(1)).toBe('track');
    expect(trackCountUnit(5)).toBe('tracks');
  });
});
