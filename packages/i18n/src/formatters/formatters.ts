import {
  PlaylistSyncStatus,
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';

import type { Translator } from '../createTranslator/createTranslator.js';
import type { Messages } from '../en.js';

/*
 * Relative time and number formatting are hand-rolled rather than taken from
 * `Intl`, for the reason the whole package exists: Hermes, the engine an Android
 * React Native app runs on, implements `Intl.NumberFormat` by proxying the
 * platform's ICU rather than bundling one, so its output varies by Android
 * version, and it does not provide `Intl.RelativeTimeFormat` at all. One
 * repository decision is one string on both clients, so both are ours.
 */

const SECOND_IN_MILLISECONDS = 1000;
const MINUTE_IN_MILLISECONDS = 60 * SECOND_IN_MILLISECONDS;
const HOUR_IN_MILLISECONDS = 60 * MINUTE_IN_MILLISECONDS;
const DAY_IN_MILLISECONDS = 24 * HOUR_IN_MILLISECONDS;

function toMilliseconds(value: number | Date): number {
  return value instanceof Date ? value.getTime() : value;
}

/**
 * The design's words for an age: `just now`, a count of minutes, hours, days,
 * weeks, months or years, and `yesterday` for the one day that has its own
 * word. A future timestamp reads as `just now`, so clock skew never shows a
 * negative age. The ladder is fixed here rather than in the design record,
 * which shows the words but not their boundaries.
 */
export function formatRelativeTime(
  t: Translator<Messages>,
  timestamp: number | Date,
  now: number | Date
): string {
  const elapsed = toMilliseconds(now) - toMilliseconds(timestamp);

  if (elapsed < MINUTE_IN_MILLISECONDS) {
    return t('relative.justNow');
  }

  const minutes = Math.floor(elapsed / MINUTE_IN_MILLISECONDS);
  if (minutes < 60) {
    return t('relative.minute', { count: minutes });
  }

  const hours = Math.floor(elapsed / HOUR_IN_MILLISECONDS);
  if (hours < 24) {
    return t('relative.hour', { count: hours });
  }

  const days = Math.floor(elapsed / DAY_IN_MILLISECONDS);
  if (days === 1) {
    return t('relative.yesterday');
  }
  if (days < 7) {
    return t('relative.day', { count: days });
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return t('relative.week', { count: weeks });
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return t('relative.month', { count: months });
  }

  return t('relative.year', { count: Math.max(1, Math.floor(days / 365)) });
}

/**
 * The header's sync line: `Synced 2 days ago` or `Never synced` while
 * `lastSyncedAt` is null. The word is part of the string, so both clients
 * render it identically.
 */
export function formatLastSynced(
  t: Translator<Messages>,
  lastSyncedAt: number | Date | null,
  now: number | Date
): string {
  if (lastSyncedAt === null) {
    return t('lastSynced.never');
  }

  return t('lastSynced.synced', {
    time: formatRelativeTime(t, lastSyncedAt, now)
  });
}

/**
 * The header's sync state word: `Up to date`, `Syncing` or `Sync failed`. The
 * word is mandatory rather than decorative, because it is what survives when the
 * tone cannot be seen and what explains a fault the dot alone cannot. A playlist
 * that has never synced is still `Up to date` here; its never-synced state is
 * carried by `formatLastSynced`, which is the second half of the line.
 */
export function syncStateLabel(
  t: Translator<Messages>,
  status: PlaylistSyncStatus
): string {
  if (status === PlaylistSyncStatus.Syncing) {
    return t('syncState.syncing');
  }

  if (status === PlaylistSyncStatus.Error) {
    return t('syncState.failed');
  }

  return t('syncState.upToDate');
}

/**
 * The track row's state word, or null when there is nothing to say. Stored is
 * the default and stays silent: a row with nothing wrong should not announce
 * that it is fine, and the absence of a word is the state.
 *
 * A removed source names the source, whatever the file's status is: the source
 * is gone and the file should not compete with that news. `Removed from
 * {{provider}}` is the word for a stored, playable track and for one with no
 * file alike.
 */
export function trackStateLabel(
  t: Translator<Messages>,
  fileStatus: TrackFileStatus,
  sourceStatus: TrackSourceStatus,
  provider: Provider
): string | null {
  if (sourceStatus === TrackSourceStatus.Removed) {
    return t('trackState.removedFrom', {
      provider: providerLabel(t, provider)
    });
  }

  if (fileStatus === TrackFileStatus.Stored) {
    return null;
  }

  if (fileStatus === TrackFileStatus.Pending) {
    return t('trackState.pending');
  }

  if (fileStatus === TrackFileStatus.Downloading) {
    return t('trackState.downloading');
  }

  if (fileStatus === TrackFileStatus.Failed) {
    return t('trackState.failed');
  }

  return t('trackState.unavailable');
}

/*
 * Only YouTube exists today, but this is a function rather than a literal so the
 * removed-track sentence names the source without the row knowing which
 * providers there are.
 */
export function providerLabel(
  t: Translator<Messages>,
  provider: Provider
): string {
  if (provider === Provider.Youtube) {
    return t('provider.youtube');
  }

  return provider;
}

export function trackCountUnit(t: Translator<Messages>, count: number): string {
  return t('count.unit', { count });
}

/**
 * It counts associations, is drawn even before the tracks load, and takes no
 * thousands separator on purpose: the count reads `1284 tracks`.
 */
export function formatTrackCount(
  t: Translator<Messages>,
  count: number
): string {
  return t('count.tracks', { count });
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * `M:SS`, or `H:MM:SS` once it passes an hour. The minute is unpadded below an
 * hour because the display reads `4:18`, and padded above it so the hour column
 * lines up. It reads the same in every language, which is why it takes no
 * translator.
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
