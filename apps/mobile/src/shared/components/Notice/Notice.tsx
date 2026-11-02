import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../a11y/useReduceMotion';
import {
  fontFamily,
  tokenColor,
  tokenDuration,
  tokenLength,
  tokenNumber
} from '../../styles/tokens';

export interface NoticeProps {
  /** The sentence, naming what was pressed. */
  readonly message: string;
  /** The line under it, saying what happened. */
  readonly detail?: string | null;
  readonly onDismiss: () => void;
  readonly durationMs?: number;
  /** Space the notice must clear under it, such as a floating action. */
  readonly bottomOffset?: number;
}

const DEFAULT_DURATION = 4000;
const SWIPE_START = 12;
const DISMISS_FRACTION = 0.26;
const DISMISS_VELOCITY = 0.4;
const EASE = Easing.bezier(...standardEasingBezier);

/** A swipe leaves on a long drag or a fast flick, in either direction. */
export function dismissesOnSwipe(
  dx: number,
  vx: number,
  width: number
): boolean {
  return (
    Math.abs(dx) > width * DISMISS_FRACTION ||
    (Math.abs(vx) > DISMISS_VELOCITY && Math.abs(dx) > 24)
  );
}

/* A transient notice that withdraws itself, and leaves at once when swiped out
 * left or right. */
export default function Notice({
  message,
  detail = null,
  onDismiss,
  durationMs = DEFAULT_DURATION,
  bottomOffset = 0
}: NoticeProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  const appearing = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const travelWidth = useRef(width);
  travelWidth.current = width;
  const gone = useRef(false);

  /* The swipe leaves on its own gesture, so only the timer's withdrawal fades
   * and settles the notice out. */
  const finish = useCallback((): void => {
    if (gone.current) {
      return;
    }

    gone.current = true;
    dismiss.current();
  }, []);

  const leave = useCallback((): void => {
    if (gone.current) {
      return;
    }

    if (reduceMotion) {
      finish();
      return;
    }

    Animated.timing(appearing, {
      toValue: 0,
      duration: tokenDuration('motion-fast'),
      easing: EASE,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        finish();
      }
    });
  }, [appearing, finish, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      appearing.setValue(1);
      return;
    }

    appearing.setValue(0);
    const enter = Animated.timing(appearing, {
      toValue: 1,
      duration: tokenDuration('motion-base'),
      easing: EASE,
      useNativeDriver: true
    });
    enter.start();

    return () => enter.stop();
  }, [appearing, reduceMotion]);

  useEffect(() => {
    const timer = setTimeout(leave, durationMs);

    return () => clearTimeout(timer);
  }, [detail, durationMs, leave, message]);

  const settle = appearing.interpolate({
    inputRange: [0, 1],
    outputRange: [tokenLength('space-2'), 0]
  });

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > SWIPE_START &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_event, gesture) => {
          translateX.setValue(gesture.dx);
        },
        onPanResponderRelease: (_event, gesture) => {
          if (!dismissesOnSwipe(gesture.dx, gesture.vx, travelWidth.current)) {
            Animated.spring(translateX, {
              toValue: 0,
              bounciness: 0,
              useNativeDriver: true
            }).start();
            return;
          }

          if (reduceMotion) {
            finish();
            return;
          }

          Animated.timing(translateX, {
            toValue:
              gesture.dx > 0 ? travelWidth.current : -travelWidth.current,
            duration: tokenDuration('motion-base'),
            easing: EASE,
            useNativeDriver: true
          }).start(({ finished }) => {
            if (finished) {
              finish();
            }
          });
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            bounciness: 0,
            useNativeDriver: true
          }).start();
        }
      }),
    [finish, reduceMotion, translateX]
  );

  return (
    <Animated.View
      testID="notice"
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.notice,
        {
          bottom: insets.bottom + tokenLength('space-4') + bottomOffset,
          opacity: appearing,
          transform: [{ translateX }, { translateY: settle }]
        }
      ]}
      {...pan.panHandlers}>
      <Text style={styles.message}>{message}</Text>
      {detail === null ? null : <Text style={styles.detail}>{detail}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  notice: {
    position: 'absolute',
    left: tokenLength('space-4'),
    right: tokenLength('space-4'),
    gap: tokenLength('space-1'),
    padding: tokenLength('space-3'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-card'),
    backgroundColor: tokenColor('surface-raised')
  },
  message: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '600',
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  },
  detail: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    lineHeight: tokenLength('text-xs') * tokenNumber('leading-normal')
  }
});
