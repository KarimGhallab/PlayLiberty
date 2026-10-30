import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TrackTone } from '@playliberty/ui-foundation';

import {
  fontFamily,
  tokenColor,
  tokenLength,
  touchTarget
} from '../../styles/tokens';

export type ChipTone = 'accent' | TrackTone;

const TONE_COLORS = {
  [TrackTone.Stored]: 'tone-stored',
  [TrackTone.Pending]: 'tone-pending',
  [TrackTone.Downloading]: 'tone-downloading',
  [TrackTone.Failed]: 'tone-failed',
  [TrackTone.Unavailable]: 'tone-unavailable',
  [TrackTone.Removed]: 'tone-removed'
} as const;

function toneColor(tone: ChipTone): string {
  return tone === 'accent'
    ? tokenColor('accent')
    : tokenColor(TONE_COLORS[tone]);
}

export interface ChipProps {
  readonly label: string;
  readonly count?: number;
  readonly tone?: ChipTone;
  readonly selected?: boolean;
  readonly onPress: () => void;
}

/* The one interactive chip: a border, a word, an optional count, and a dot that
 * appears when the chip is in force. */
export default function Chip({
  label,
  count,
  tone = 'accent',
  selected = false,
  onPress
}: ChipProps) {
  const color = toneColor(tone);
  const inkSelected = tone === TrackTone.Stored || tone === TrackTone.Pending;
  const labelColor = selected
    ? inkSelected
      ? tokenColor('ink')
      : color
    : tokenColor('muted');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={count === undefined ? label : `${label} ${count}`}
      style={[
        styles.chip,
        { borderColor: selected ? color : tokenColor('control-border') }
      ]}
      onPress={onPress}>
      <View
        style={[
          styles.indicator,
          {
            backgroundColor: color,
            transform: [{ scale: selected ? 1 : 0 }]
          }
        ]}
      />
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      {count === undefined ? null : (
        <Text style={[styles.count, { color: labelColor }]}>{count}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2'),
    paddingHorizontal: tokenLength('space-3'),
    borderWidth: 1,
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: 'transparent'
  },
  indicator: {
    width: 7,
    height: 7,
    borderRadius: tokenLength('radius-chip')
  },
  label: {
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '500'
  },
  count: {
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontVariant: ['tabular-nums']
  }
});
