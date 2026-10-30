import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import {
  equalizerRests,
  standardEasingBezier
} from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../a11y/useReduceMotion';
import { tokenColor, tokenLength } from '../../styles/tokens';

/** The mark's phases, in bar order, in milliseconds. */
const PULSES: readonly number[] = [520, 700, 460, 620, 800, 560];
const BAR_MAX = tokenLength('space-8');

export interface EqualizerBarsProps {
  readonly busy: boolean;
}

/** The six-bar mark: still at its resting scales, moving while the door works. */
export default function EqualizerBars({ busy }: EqualizerBarsProps) {
  const reduceMotion = useReduceMotion();
  const values = useRef(
    equalizerRests.map(rest => new Animated.Value(rest * BAR_MAX))
  ).current;

  useEffect(() => {
    if (!busy || reduceMotion) {
      values.forEach((value, index) => {
        value.stopAnimation();
        value.setValue((equalizerRests[index] ?? 1) * BAR_MAX);
      });

      return;
    }

    const loops = values.map((value, index) => {
      const rest = (equalizerRests[index] ?? 1) * BAR_MAX;
      const pulse = PULSES[index] ?? 600;

      return Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: rest * 0.35,
            duration: pulse,
            easing: Easing.bezier(...standardEasingBezier),
            useNativeDriver: false
          }),
          Animated.timing(value, {
            toValue: rest,
            duration: pulse,
            easing: Easing.bezier(...standardEasingBezier),
            useNativeDriver: false
          })
        ])
      );
    });

    loops.forEach(loop => loop.start());

    return () => {
      loops.forEach(loop => loop.stop());
    };
  }, [busy, reduceMotion, values]);

  return (
    <View style={styles.bars}>
      {values.map((value, index) => (
        <Animated.View
          key={`${index}:${equalizerRests[index] ?? 0}`}
          style={[styles.bar, { height: value }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokenLength('space-1'),
    height: BAR_MAX
  },
  bar: {
    width: tokenLength('space-2'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('ink')
  }
});
