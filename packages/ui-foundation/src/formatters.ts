import {
  PlaylistSyncStatus,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';

/*
 * The strings both clients render. The exact output is the contract, so the
 * tests pin every case rather than a shape.
 *
 * Relative time and number formatting are hand-rolled rather than taken from
 * `Intl`. Hermes, the engine an Android React Native app runs on, implements
 * `Intl.NumberFormat` by proxying the platform's ICU rather than bundling one,
 * so its output varies by Android version, and it does not provide
 * `Intl.RelativeTimeFormat` at all. One repository decision is one string on
 * both clients, so both formatters are ours.
 */

const SECOND_IN_MILLISECONDS = 1000;
const MINUTE_IN_MILLISECONDS = 60 * SECOND_IN_MILLISECONDS;
const HOUR_IN_MILLISECONDS = 60 * MINUTE_IN_MILLISECONDS;
const DAY_IN_MILLISECONDS = 24 * HOUR_IN_MILLISECONDS;

function toMilliseconds(value: number | Date): number {
  return value instanceof Date ? value.getTime() : value;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function pluralise(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}

function ago(count: number, unit: string): string {
  return `${count} ${pluralise(count, unit)} ago`;
}

/**
 * A track duration as `M:SS`, or `H:MM:SS` once it passes an hour. The minute
 * is unpadded below an hour because the specimens draw `4:18`, and padded above
 * it so the hour column lines up.
 */
export function formatDuration(seconds: number): string {
  const total = Math.floor(seconds);

  if (!Number.isFinite(total) || total <= 0) {
    return '0:00';
  }

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`;
  }

  return `${minutes}:${pad(remainingSeconds)}`;
}

/**
 * How long ago a timestamp was, in the design's words: `just now`, a count of
 * minutes, hours, days, weeks, months or years, and `yesterday` for the one day
 * that has its own word. A future timestamp reads as `just now`, so clock skew
 * never shows a negative age. The ladder is fixed here rather than in the
 * design record, which shows the words but not their boundaries.
 */
export function formatRelativeTime(
  timestamp: number | Date,
  now: number | Date
): string {
  const elapsed = toMilliseconds(now) - toMilliseconds(timestamp);

  if (elapsed < MINUTE_IN_MILLISECONDS) {
    return 'just now';
  }

  const minutes = Math.floor(elapsed / MINUTE_IN_MILLISECONDS);
  if (minutes < 60) {
    return ago(minutes, 'minute');
  }

  const hours = Math.floor(elapsed / HOUR_IN_MILLISECONDS);
  if (hours < 24) {
    return ago(hours, 'hour');
  }

  const days = Math.floor(elapsed / DAY_IN_MILLISECONDS);
  if (days === 1) {
    return 'yesterday';
  }
  if (days < 7) {
    return ago(days, 'day');
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return ago(weeks, 'week');
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return ago(months, 'month');
  }

  return ago(Math.max(1, Math.floor(days / 365)), 'year');
}

/**
 * The header's sync line: `Synced 2 days ago`, `Synced yesterday`, or
 * `Never synced` while `lastSyncedAt` is still null. The word is part of the
 * string, so both clients render it identically.
 */
export function formatLastSynced(
  lastSyncedAt: number | Date | null,
  now: number | Date
): string {
  if (lastSyncedAt === null) {
    return 'Never synced';
  }

  return `Synced ${formatRelativeTime(lastSyncedAt, now)}`;
}

/**
 * The header's sync state word: `Up to date`, `Syncing` or `Sync failed`. The
 * word is mandatory rather than decorative, because it is what survives when the
 * tone cannot be seen and what explains a fault the dot alone cannot. A playlist
 * that has never synced is still `Up to date` here; its never-synced state is
 * carried by `formatLastSynced`, which is the second half of the line.
 */
export function syncStateLabel(status: PlaylistSyncStatus): string {
  if (status === PlaylistSyncStatus.Syncing) {
    return 'Syncing';
  }

  if (status === PlaylistSyncStatus.Error) {
    return 'Sync failed';
  }

  return 'Up to date';
}

/**
 * The track row's state word, or null when there is nothing to say. Stored is
 * the default and stays silent: a row with nothing wrong should not announce
 * that it is fine, and the absence of a word is the state.
 *
 * The precedence is `trackTone`'s: a removed track reads `Removed, still here`
 * whatever its file status is, because the source is gone and the file should
 * not compete with that news. `still here` is the product's whole promise, and
 * the exact string is the contract, so both clients render it identically.
 */
export function trackStateLabel(
  fileStatus: TrackFileStatus,
  sourceStatus: TrackSourceStatus
): string | null {
  if (sourceStatus === TrackSourceStatus.Removed) {
    return 'Removed, still here';
  }

  if (fileStatus === TrackFileStatus.Stored) {
    return null;
  }

  if (fileStatus === TrackFileStatus.Pending) {
    return 'Pending';
  }

  if (fileStatus === TrackFileStatus.Downloading) {
    return 'Downloading';
  }

  if (fileStatus === TrackFileStatus.Failed) {
    return 'Failed';
  }

  return 'Unavailable';
}

/** The unit word for a track count, singular only at one. */
export function trackCountUnit(count: number): string {
  return count === 1 ? 'track' : 'tracks';
}

/**
 * A playlist's track count. It counts associations, is drawn even before the
 * tracks load, and takes no thousands separator on purpose: the specimens draw
 * `1284 tracks`.
 */
export function formatTrackCount(count: number): string {
  return `${count} ${trackCountUnit(count)}`;
}
