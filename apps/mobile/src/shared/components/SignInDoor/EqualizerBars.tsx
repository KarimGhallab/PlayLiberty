import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import {
  equalizerRests,
  standardEasingBezier
} from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../a11y/useReduceMotion/useReduceMotion';
import { tokenColor, tokenLength } from '../../styles/tokens/tokens';

/** The mark's phases, in bar order, in milliseconds. */
const PULSES: readonly number[] = [520, 700, 460, 620, 800, 560];
const BAR_MAX = tokenLength('space-8');
/* The lowest point of a pulse, as a fraction of the bar's resting height. */
const PULSE_FLOOR = 0.35;

export interface EqualizerBarsProps {
  readonly busy: boolean;
}

/* The six-bar mark: still at its resting scales, moving while the door works. */
export default function EqualizerBars({ busy }: EqualizerBarsProps) {
  const reduceMotion = useReduceMotion();
  const values = useRef(
    equalizerRests.map(() => new Animated.Value(1))
  ).current;

  useEffect(() => {
    if (!busy || reduceMotion) {
      values.forEach(value => {
        value.stopAnimation();
        value.setValue(1);
      });

      return;
    }

    const loops = values.map((value, index) => {
      const pulse = PULSES[index] ?? 600;

      return Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: PULSE_FLOOR,
            duration: pulse,
            easing: Easing.bezier(...standardEasingBezier),
            useNativeDriver: true
          }),
          Animated.timing(value, {
            toValue: 1,
            duration: pulse,
            easing: Easing.bezier(...standardEasingBezier),
            useNativeDriver: true
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
      {values.map((value, index) => {
        const rest = equalizerRests[index] ?? 1;

        return (
          <Animated.View
            key={`${index}:${rest}`}
            testID={`equalizer-bar-${index}`}
            style={[
              styles.bar,
              { height: rest * BAR_MAX, transform: [{ scaleY: value }] }
            ]}
          />
        );
      })}
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
    backgroundColor: tokenColor('ink'),
    transformOrigin: 'bottom'
  }
});
