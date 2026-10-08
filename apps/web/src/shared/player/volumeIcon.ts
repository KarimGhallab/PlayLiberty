import {
  IconVolume,
  IconVolume2,
  IconVolume3,
  IconVolume4
} from '@tabler/icons-react';

/*
 * The speaker glyph, by the level and the mute bit. Mute wins over the level, so
 * a silenced output always shows the crossed speaker whatever the level is, and
 * the three loud glyphs split the level into thirds. The volume control's button
 * and the volume notice both read it, so it is one function rather than two that
 * could pick different glyphs for the same level.
 */
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
