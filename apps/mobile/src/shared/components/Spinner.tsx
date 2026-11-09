import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { useReduceMotion } from '../a11y/useReduceMotion/useReduceMotion';
import { tokenLength, tokenNumber } from '../styles/tokens/tokens';

export interface SpinnerProps {
  readonly color: string;
}

/** The one spinner: a cut ring in the caller's colour, sized to the icon box. */
export default function Spinner({ color }: SpinnerProps) {
  const reduceMotion = useReduceMotion();
  const turn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const loop = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );

    loop.start();

    return () => {
      loop.stop();
      turn.setValue(0);
    };
  }, [reduceMotion, turn]);

  const rotate = turn.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.spinner,
        {
          borderColor: color,
          borderTopColor: reduceMotion ? color : 'transparent'
        },
        reduceMotion && styles.still,
        { transform: [{ rotate }] }
      ]}
    />
  );
}

const styles = StyleSheet.create({
  spinner: {
    width: tokenLength('icon-sm'),
    height: tokenLength('icon-sm'),
    borderWidth: 2,
    borderRadius: tokenLength('radius-chip')
  },
  still: {
    opacity: tokenNumber('opacity-disabled')
  }
});
