import { useEffect, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent
} from 'react-native';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../a11y/useReduceMotion';
import { tokenColor, tokenDuration, tokenLength } from '../../styles/tokens';

const FADE_WIDTH = tokenLength('space-6');

export interface RailEdges {
  readonly start: boolean;
  readonly end: boolean;
}

interface RailMetrics {
  x: number;
  width: number;
  viewport: number;
}

export interface RailEdgeHandlers {
  readonly onLayout: (event: LayoutChangeEvent) => void;
  readonly onContentSizeChange: (width: number) => void;
  readonly onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

/* A horizontal rail reports which ends still hide content, so the fade can
 * follow the rail rather than the content. */
export function useRailEdges(): RailEdgeHandlers & {
  readonly edges: RailEdges;
} {
  const [edges, setEdges] = useState<RailEdges>({
    start: false,
    end: false
  });
  const metrics = useRef<RailMetrics>({ x: 0, width: 0, viewport: 0 });

  const moved = (next: Partial<RailMetrics>): void => {
    const current = { ...metrics.current, ...next };
    metrics.current = current;
    const start = current.x > 1;
    const end =
      current.viewport > 0 && current.x + current.viewport < current.width - 1;
    setEdges(previous =>
      previous.start === start && previous.end === end
        ? previous
        : { start, end }
    );
  };

  return {
    edges,
    onLayout: event => moved({ viewport: event.nativeEvent.layout.width }),
    onContentSizeChange: width => moved({ width }),
    onScroll: event => moved({ x: event.nativeEvent.contentOffset.x })
  };
}

export interface RailFadeProps {
  readonly side: 'start' | 'end';
  readonly visible: boolean;
}

/* The rail's hidden edge: the ground fades over what the scroll cut, so the rail
 * reads as continuing rather than as a clipped control. */
export function RailFade({ side, visible }: RailFadeProps) {
  const reduceMotion = useReduceMotion();
  const reveal = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      reveal.setValue(visible ? 1 : 0);
      return;
    }

    const animation = Animated.timing(reveal, {
      toValue: visible ? 1 : 0,
      duration: tokenDuration('motion-base'),
      easing: Easing.bezier(...standardEasingBezier),
      useNativeDriver: true
    });
    animation.start();

    return () => animation.stop();
  }, [reduceMotion, reveal, visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.fade,
        side === 'start' ? styles.fadeStart : styles.fadeEnd,
        { opacity: reveal }
      ]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={`rail-fade-${side}`} x1="0" y1="0" x2="1" y2="0">
            <Stop
              offset="0"
              stopColor={tokenColor('bg')}
              stopOpacity={side === 'start' ? 1 : 0}
            />
            <Stop
              offset="1"
              stopColor={tokenColor('bg')}
              stopOpacity={side === 'start' ? 0 : 1}
            />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#rail-fade-${side})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: FADE_WIDTH
  },
  fadeStart: {
    left: 0
  },
  fadeEnd: {
    right: 0
  }
});
