import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from 'react-native';

import { usePressScale } from './usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<
  PressableProps,
  'style' | 'android_ripple'
> {
  readonly style?: StyleProp<ViewStyle>;
}

/** A pressable that carries the app's press. */
export default function PressableScale({
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const { pressTo, style: pressStyle } = usePressScale(disabled === true);

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      style={[style, pressStyle]}
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
