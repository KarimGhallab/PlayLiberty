import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { equalizerRests } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../a11y/useReduceMotion';
import { tokenColor, tokenLength } from '../../styles/tokens';

const BAR_MAX = tokenLength('space-8');
/* One cycle of the web's keyframe table, in milliseconds. */
const CYCLE = 1400;
const FRAMES = [
  { at: 0, scale: 0.3 },
  { at: 308, scale: 1 },
  { at: 672, scale: 0.5 },
  { at: 1008, scale: 0.78 },
  { at: CYCLE, scale: 0.3 }
] as const;
/* Every bar runs that cycle at a different point, so the strip never steps. */
const PHASES = [0, 380, 760, 1150, 130, 510];

function cycleScale(at: number): number {
  const position = ((at % CYCLE) + CYCLE) % CYCLE;

  for (let index = 0; index < FRAMES.length - 1; index += 1) {
    const from = FRAMES[index];
    const to = FRAMES[index + 1];

    if (from === undefined || to === undefined) {
      break;
    }

    if (position <= to.at) {
      const progress = (position - from.at) / (to.at - from.at);

      return from.scale + (to.scale - from.scale) * progress;
    }
  }

  return FRAMES[FRAMES.length - 1]?.scale ?? 0.3;
}

/* The clock runs a whole cycle; a bar's scale is read where its phase meets it.
 * Both ends of the range hold the same sample, so the jump back to zero is not
 * a jump on screen. */
function phaseRange(phase: number): {
  readonly inputRange: readonly number[];
  readonly outputRange: readonly number[];
} {
  const crossings = FRAMES.flatMap(frame => [
    frame.at - phase,
    frame.at - phase + CYCLE
  ])
    .filter(at => at > 0 && at < CYCLE)
    .sort((left, right) => left - right);

  return {
    inputRange: [0, ...crossings, CYCLE],
    outputRange: [
      cycleScale(phase),
      ...crossings.map(at => cycleScale(at + phase)),
      cycleScale(phase)
    ]
  };
}

export interface TrackBarsProps {
  /* Whether the queue is playing; a paused row freezes on its last frame. */
  readonly playing: boolean;
}

/* The current row's equalizer. The word names the playback state, so the strip
 * is decorative; a pause holds the frame and a resume carries on from it. */
export default function TrackBars({ playing }: TrackBarsProps) {
  const reduceMotion = useReduceMotion();
  const clock = useRef(new Animated.Value(0)).current;
  const running = useRef<Animated.CompositeAnimation | null>(null);
  /* The wall clock at the cycle's zero, so a pause can read where it stopped. */
  const cycleStart = useRef(0);
  const held = useRef(0);

  const scales = useMemo(
    () =>
      PHASES.map(phase => {
        const { inputRange, outputRange } = phaseRange(phase);

        return clock.interpolate({
          inputRange: [...inputRange],
          outputRange: [...outputRange]
        });
      }),
    [clock]
  );

  useEffect(() => {
    if (!playing || reduceMotion) {
      const at =
        cycleStart.current === 0
          ? 0
          : (Date.now() - cycleStart.current) % CYCLE;

      held.current = at;
      running.current?.stop();
      running.current = null;
      clock.setValue(at);

      return;
    }

    let live = true;

    /* Restarting a native loop resets the clock, so the resume plays out the
     * rest of the held cycle first and only then hands over to the loop. */
    const loop = (): void => {
      if (!live) {
        return;
      }

      cycleStart.current = Date.now();
      clock.setValue(0);
      const animation = Animated.loop(
        Animated.timing(clock, {
          toValue: CYCLE,
          duration: CYCLE,
          easing: Easing.linear,
          useNativeDriver: true
        })
      );

      running.current = animation;
      animation.start();
    };

    if (held.current > 0 && held.current < CYCLE) {
      cycleStart.current = Date.now() - held.current;
      const timing = Animated.timing(clock, {
        toValue: CYCLE,
        duration: Math.max(1, Math.round(CYCLE - held.current)),
        easing: Easing.linear,
        useNativeDriver: true
      });

      running.current = timing;
      timing.start(({ finished }) => {
        if (finished) {
          loop();
        }
      });
    } else {
      loop();
    }

    return () => {
      live = false;
      running.current?.stop();
      running.current = null;
    };
  }, [clock, playing, reduceMotion]);

  return (
    <View
      testID="track-bars"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={styles.bars}>
      {equalizerRests.map((rest, index) => {
        const scale = scales[index];

        return (
          <Animated.View
            key={`${index}:${rest}`}
            style={[
              styles.bar,
              { height: rest * BAR_MAX },
              !reduceMotion && scale !== undefined
                ? { transform: [{ scaleY: scale }] }
                : null
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BAR_MAX,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: tokenLength('space-1'),
    paddingHorizontal: tokenLength('space-1')
  },
  bar: {
    width: 3,
    borderRadius: 1,
    backgroundColor: tokenColor('accent'),
    transformOrigin: 'bottom'
  }
});
