/*
 * The contracts for the shared UI decisions.
 */

/**
 * The six display tones, one per track state. Each value names the `tone-*`
 * token that carries it, so a client resolves a tone to its own platform's
 * colour without a colour crossing this package.
 */
export enum TrackTone {
  Pending = 'pending',
  Downloading = 'downloading',
  Stored = 'stored',
  Failed = 'failed',
  Unavailable = 'unavailable',
  Removed = 'removed'
}
