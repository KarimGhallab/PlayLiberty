import {
  IconVolume,
  IconVolume2,
  IconVolume3,
  IconVolume4
} from '@tabler/icons-react';

/* The speaker glyph, shared by the button and the notice, one per level. */
export function volumeIcon(volume: number, muted: boolean) {
  if (muted || volume <= 0) {
    return IconVolume3;
  }

  if (volume <= 0.33) {
    return IconVolume4;
  }

  if (volume <= 0.66) {
    return IconVolume2;
  }

  return IconVolume;
}
