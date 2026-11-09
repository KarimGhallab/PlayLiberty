import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../a11y/useReduceMotion/useReduceMotion';
import { tokenColor, tokenDuration } from '../styles/tokens/tokens';

/* The web's 2px playing rule. */
const RULE_HEIGHT = 2;

export interface PlayingLineProps {
  readonly playing: boolean;
}

/* The playing queue's mark: an amber rule that enters from its start with the
 * queue and withdraws when it pauses or another playlist takes over. */
export default function PlayingLine({ playing }: PlayingLineProps) {
  const reduceMotion = useReduceMotion();
  const reveal = useRef(new Animated.Value(playing ? 1 : 0)).current;
  const previous = useRef(playing);

  useEffect(() => {
    if (previous.current === playing) {
      return;
    }

    previous.current = playing;

    if (reduceMotion) {
      reveal.setValue(playing ? 1 : 0);
      return;
    }

    const animation = Animated.timing(reveal, {
      toValue: playing ? 1 : 0,
      duration: tokenDuration('motion-base'),
      easing: Easing.bezier(...standardEasingBezier),
      useNativeDriver: true
    });
    animation.start();

    return () => animation.stop();
  }, [playing, reduceMotion, reveal]);

  return (
    <View pointerEvents="none" style={styles.track}>
      <Animated.View
        style={[styles.rule, { transform: [{ scaleX: reveal }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: RULE_HEIGHT,
    overflow: 'hidden'
  },
  rule: {
    width: '100%',
    height: RULE_HEIGHT,
    transformOrigin: 'left',
    backgroundColor: tokenColor('emphasis')
  }
});
