import { useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../a11y/useReduceMotion/useReduceMotion';
import { tokenDuration } from '../../styles/tokens/tokens';

/* The app's press: shrink and dim on the fast curve. A disabled control
 * shrinks without the dim. */
export function usePressScale(disabled: boolean) {
  const reduceMotion = useReduceMotion();
  const press = useRef(new Animated.Value(0)).current;

  const pressTo = (to: number): void => {
    if (reduceMotion) {
      press.setValue(to);
      return;
    }

    Animated.timing(press, {
      toValue: to,
      duration: tokenDuration('motion-fast'),
      easing: Easing.bezier(...standardEasingBezier),
      useNativeDriver: true
    }).start();
  };

  const transform = [
    {
      scale: press.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.9]
      })
    }
  ];
  const opacity = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.8]
  });

  return {
    pressTo,
    style: disabled ? { transform } : { transform, opacity }
  };
}
