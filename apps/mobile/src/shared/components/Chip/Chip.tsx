import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';

import { TrackTone, standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../a11y/useReduceMotion';
import {
  fontFamily,
  tokenColor,
  tokenDuration,
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
 * grows when the chip is in force. */
export default function Chip({
  label,
  count,
  tone = 'accent',
  selected = false,
  onPress
}: ChipProps) {
  const reduceMotion = useReduceMotion();
  const color = toneColor(tone);
  const inkSelected = tone === TrackTone.Stored || tone === TrackTone.Pending;
  const labelColor = selected
    ? inkSelected
      ? tokenColor('ink')
      : color
    : tokenColor('muted');
  const reveal = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    const target = selected ? 1 : 0;

    if (reduceMotion) {
      reveal.setValue(target);
      return;
    }

    Animated.timing(reveal, {
      toValue: target,
      duration: tokenDuration('motion-base'),
      easing: Easing.bezier(...standardEasingBezier),
      useNativeDriver: true
    }).start();
  }, [reduceMotion, reveal, selected]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={count === undefined ? label : `${label} ${count}`}
      style={styles.chip}
      onPress={onPress}>
      <Animated.View
        pointerEvents="none"
        style={[styles.border, { borderColor: color, opacity: reveal }]}
      />
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: color,
            opacity: reveal,
            transform: [
              {
                scale: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1]
                })
              }
            ]
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
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: 'transparent'
  },
  border: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderWidth: 1,
    borderRadius: tokenLength('radius-chip')
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
