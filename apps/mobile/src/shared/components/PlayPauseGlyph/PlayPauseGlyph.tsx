import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react';
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

export interface PlayPauseGlyphHandle {
  /** Runs the morph now, for a press whose state lands a render later. */
  morphTo(playing: boolean): void;
}

/* The web's play/pause morph: the pinned frames on one clipped strip, stepped
 * a frame at a time rather than drawn per state. */
const PlayPauseGlyph = memo(
  forwardRef<PlayPauseGlyphHandle, PlayPauseGlyphProps>(function PlayPauseGlyph(
    { playing, size, color },
    ref
  ) {
    const reduceMotion = useReduceMotion();
    const travel = (playPauseMorph.stripTravel * size) / FRAME_VIEWBOX;
    const translateX = useRef(new Animated.Value(playing ? travel : 0)).current;
    const previous = useRef(playing);

    const morphTo = useCallback(
      (next: boolean): void => {
        previous.current = next;
        const toValue = next ? travel : 0;

        if (reduceMotion) {
          translateX.setValue(toValue);
          return;
        }

        Animated.timing(translateX, {
          toValue,
          duration: playPauseMorph.durationMs,
          easing: stepped,
          // The native driver samples the stepped curve up front, so a busy
          // render cannot stretch or skip the morph.
          useNativeDriver: true
        }).start();
      },
      [reduceMotion, translateX, travel]
    );

    useImperativeHandle(ref, () => ({ morphTo }), [morphTo]);

    useEffect(() => {
      if (previous.current === playing) {
        return;
      }

      morphTo(playing);
    }, [morphTo, playing]);

    useEffect(
      () => () => {
        translateX.stopAnimation();
      },
      [translateX]
    );

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
  })
);

export default PlayPauseGlyph;

const styles = StyleSheet.create({
  window: {
    overflow: 'hidden'
  },
  strip: {
    flexDirection: 'row'
  }
});
