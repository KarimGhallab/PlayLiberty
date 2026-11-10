/** The six track-state tones, each naming the `tone-*` token that carries it,
 * so no colour crosses this package. */
export enum TrackTone {
  Pending = 'pending',
  Downloading = 'downloading',
  Stored = 'stored',
  Failed = 'failed',
  Unavailable = 'unavailable',
  Removed = 'removed',
  Retained = 'retained'
}
