import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { playPauseMorph } from '@playliberty/tokens';

import { useReduceMotion } from '../../a11y/useReduceMotion';

/* The glyphs' 24 unit grid, and the first frame's optical nudge. */
const FRAME_VIEWBOX = 24;
const PLAY_FRAME_SHIFT = -1.5;
const STEPS = playPauseMorph.frames - 1;

/* The stylesheet's steps(7, jump-end): each frame holds, the last one lands. */
function stepped(t: number): number {
  return Math.floor(t * STEPS) / STEPS;
}

export interface PlayPauseGlyphProps {
  readonly playing: boolean;
  readonly size: number;
  readonly color: string;
}

/* The web's play/pause morph: the pinned frames on one clipped strip, stepped
 * a frame at a time rather than drawn per state. */
export default function PlayPauseGlyph({
  playing,
  size,
  color
}: PlayPauseGlyphProps) {
  const reduceMotion = useReduceMotion();
  const travel = (playPauseMorph.stripTravel * size) / FRAME_VIEWBOX;
  const translateX = useRef(new Animated.Value(playing ? travel : 0)).current;
  const previous = useRef(playing);

  useEffect(() => {
    if (previous.current === playing) {
      return;
    }

    previous.current = playing;
    const toValue = playing ? travel : 0;

    if (reduceMotion) {
      translateX.setValue(toValue);
      return;
    }

    Animated.timing(translateX, {
      toValue,
      duration: playPauseMorph.durationMs,
      easing: stepped,
      // The stepped easing is a JS function, so the JS driver owns the strip.
      useNativeDriver: false
    }).start();

    return () => {
      translateX.stopAnimation();
    };
  }, [playing, reduceMotion, translateX, travel]);

  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      style={[styles.window, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.strip,
          {
            width: size * playPauseMorph.frames,
            height: size,
            transform: [{ translateX }]
          }
        ]}>
        {playPauseMorph.table.map(frame => (
          <Svg
            key={frame.index}
            width={size}
            height={size}
            viewBox={`0 0 ${FRAME_VIEWBOX} ${FRAME_VIEWBOX}`}>
            <G
              transform={
                frame.index === 0
                  ? `translate(${PLAY_FRAME_SHIFT} 0)`
                  : undefined
              }>
              {frame.paths.map(path => (
                <Path key={path} d={path} fill={color} />
              ))}
            </G>
          </Svg>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    overflow: 'hidden'
  },
  strip: {
    flexDirection: 'row'
  }
});
