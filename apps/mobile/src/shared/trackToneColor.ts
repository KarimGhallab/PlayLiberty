import { TrackTone } from '@playliberty/ui-foundation';

import { tokenColor } from './styles/tokens/tokens';

const TONE_COLORS = {
  [TrackTone.Stored]: 'tone-stored',
  [TrackTone.Pending]: 'tone-pending',
  [TrackTone.Downloading]: 'tone-downloading',
  [TrackTone.Failed]: 'tone-failed',
  [TrackTone.Unavailable]: 'tone-unavailable',
  [TrackTone.Removed]: 'tone-removed',
  [TrackTone.Retained]: 'tone-retained'
} as const;

/** The token colour a track state's word carries. */
export function trackToneColor(tone: TrackTone): string {
  return tokenColor(TONE_COLORS[tone]);
}
