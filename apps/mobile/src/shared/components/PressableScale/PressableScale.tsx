import { useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from 'react-native';

import { standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../a11y/useReduceMotion';
import { tokenDuration } from '../../styles/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  readonly style?: StyleProp<ViewStyle>;
}

/* The app's press: the control shrinks under the thumb and returns on release,
 * on the one fast curve. The layout box never moves. */
export default function PressableScale({
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
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

  const scale = {
    transform: [
      {
        scale: press.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.9]
        })
      }
    ]
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      style={[
        style,
        disabled === true
          ? scale
          : {
              ...scale,
              opacity: press.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.8]
              })
            }
      ]}
      onPressIn={event => {
        pressTo(1);
        onPressIn?.(event);
      }}
      onPressOut={event => {
        pressTo(0);
        onPressOut?.(event);
      }}
    />
  );
}
