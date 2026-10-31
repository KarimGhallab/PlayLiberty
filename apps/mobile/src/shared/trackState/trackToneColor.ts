import { TrackTone } from '@playliberty/ui-foundation';

import { tokenColor } from '../styles/tokens';

const TONE_COLORS = {
  [TrackTone.Stored]: 'tone-stored',
  [TrackTone.Pending]: 'tone-pending',
  [TrackTone.Downloading]: 'tone-downloading',
  [TrackTone.Failed]: 'tone-failed',
  [TrackTone.Unavailable]: 'tone-unavailable',
  [TrackTone.Removed]: 'tone-removed'
} as const;

/** The token colour a track state's word carries. */
export function trackToneColor(tone: TrackTone): string {
  return tokenColor(TONE_COLORS[tone]);
}
