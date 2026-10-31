import type { TrackFileStatus } from '@playliberty/contracts';

/* The one place a query key is written. `['playlist', id]` is a prefix on
 * purpose: the playlist, its tracks, its queue, its sync run and its shares all
 * hang off it, so one invalidation reaches every read of that playlist. A key
 * with no parameter is a constant, so it cannot be called by mistake: the hash
 * of a function is `undefined`, and every query would share one entry. */

export const accountsKey = ['accounts'] as const;

/** The picker's paged read; `accountsKey` stays the single-page name lookup. */
export const accountPageKey = ['accounts', 'page'] as const;

export const currentAccountKey = ['me'] as const;

export const egressKey = ['egress'] as const;

export const libraryKey = ['playlists'] as const;

/** Every playlist read, whatever its id. */
export const playlistPrefix = ['playlist'] as const;

export const playlistKey = (playlistId: string | null) =>
  ['playlist', playlistId] as const;

export const playlistTracksKey = (
  playlistId: string,
  state?: TrackFileStatus
) => ['playlist', playlistId, 'tracks', state ?? 'all'] as const;

export const playlistQueueKey = (playlistId: string) =>
  ['playlist', playlistId, 'queue'] as const;

export const latestSyncRunKey = (playlistId: string) =>
  ['playlist', playlistId, 'sync-runs', 'latest'] as const;

export const playlistSharesKey = (playlistId: string) =>
  ['playlist', playlistId, 'shares'] as const;

export const trackKey = (trackId: string) => ['track', trackId] as const;
