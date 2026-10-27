import {
  PlaylistSyncStatus,
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';

import type {
  MessageKey,
  Translator
} from '../createTranslator/createTranslator.js';
import type { Messages } from '../en.js';

/*
 * Hand-rolled rather than `Intl`: Hermes proxies the platform ICU, so
 * `Intl.NumberFormat` output varies by Android version and there is no
 * `Intl.RelativeTimeFormat`. One decision is one string on both clients.
 */

const SECOND_IN_MILLISECONDS = 1000;
const MINUTE_IN_MILLISECONDS = 60 * SECOND_IN_MILLISECONDS;
const HOUR_IN_MILLISECONDS = 60 * MINUTE_IN_MILLISECONDS;
const DAY_IN_MILLISECONDS = 24 * HOUR_IN_MILLISECONDS;

function toMilliseconds(value: number | Date): number {
  return value instanceof Date ? value.getTime() : value;
}

/**
 * A future timestamp reads `just now`, so clock skew never shows a negative
 * age. The ladder boundaries live here; the catalog holds only the words.
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

/** The header's sync line; `Never synced` while `lastSyncedAt` is null. */
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

/* A record over the enum, not a fallback: a new sync state is a missing key,
 * not a silent `Up to date`. */
const SYNC_STATE_KEYS: Record<PlaylistSyncStatus, MessageKey<Messages>> = {
  [PlaylistSyncStatus.Idle]: 'syncState.upToDate',
  [PlaylistSyncStatus.Syncing]: 'syncState.syncing',
  [PlaylistSyncStatus.Error]: 'syncState.failed',
  [PlaylistSyncStatus.Blocked]: 'syncState.blocked'
};

/**
 * The word survives a tone that cannot be seen. A never-synced playlist still
 * reads `Up to date`; `formatLastSynced` carries that state.
 */
export function syncStateLabel(
  t: Translator<Messages>,
  status: PlaylistSyncStatus
): string {
  return t(SYNC_STATE_KEYS[status]);
}

/**
 * Null for a stored, available track: the absence of a word is the state. A
 * removed source names the source whatever the file says.
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

/* A function rather than a literal, so the removed-track sentence names the
 * source without knowing the providers. */
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

/** No thousands separator on purpose: the count reads `1284 tracks`. */
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
 * `M:SS`, padded to `H:MM:SS` past an hour so the hour column lines up. It
 * reads the same in every language, so it takes no translator.
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
