import { useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { formatDuration, useI18n } from '@playliberty/i18n';

import {
  lineHeightFor,
  useTextScale
} from '../../../shared/styles/textMetrics';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../../shared/styles/tokens';

import { MAX_BAR_TEXT_SCALE } from '../barTextScale';

const SEEK_STEP_SECONDS = 10;

export interface SeekBarProps {
  readonly durationSeconds: number | null;
  readonly positionSeconds: number;
  /** Holds the player still for the gesture. */
  readonly onSeekStart: () => void;
  /** Lets a player that was playing resume. */
  readonly onSeekEnd: () => void;
  readonly onSeek: (fraction: number) => void;
  readonly onSeekBy: (seconds: number) => void;
}

/*
 * The bar's position rail. The gesture reports its target while it is live and
 * asks for one seek on release; the drawn position is the store's, not a
 * second clock. The screen reader's actions move ten seconds each.
 */
export default function SeekBar({
  durationSeconds,
  positionSeconds,
  onSeekStart,
  onSeekEnd,
  onSeek,
  onSeekBy
}: SeekBarProps) {
  const { t } = useI18n();
  const scale = useTextScale(MAX_BAR_TEXT_SCALE);
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  const width = useRef(0);
  const dragging = useRef<number | null>(null);
  const duration =
    durationSeconds !== null &&
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0
      ? durationSeconds
      : 0;
  const enabled = duration > 0;
  const elapsed = Math.min(positionSeconds, duration);
  const fraction = duration > 0 ? elapsed / duration : 0;
  const shownFraction = dragFraction ?? fraction;
  const shownElapsed =
    dragFraction === null ? elapsed : dragFraction * duration;

  const fractionAt = (x: number): number => {
    if (width.current <= 0) {
      return 0;
    }

    return Math.min(1, Math.max(0, x / width.current));
  };

  const start = (event: GestureResponderEvent): void => {
    if (!enabled) {
      return;
    }

    const target = fractionAt(event.nativeEvent.locationX);

    dragging.current = target;
    setDragFraction(target);
    onSeekStart();
  };

  const move = (event: GestureResponderEvent): void => {
    if (dragging.current === null) {
      return;
    }

    const target = fractionAt(event.nativeEvent.locationX);

    dragging.current = target;
    setDragFraction(target);
  };

  const end = (): void => {
    const target = dragging.current;

    if (target === null) {
      return;
    }

    dragging.current = null;
    setDragFraction(null);
    onSeek(target);
    onSeekEnd();
  };

  const onAccessibilityAction = (event: {
    readonly nativeEvent: { readonly actionName: string };
  }): void => {
    if (!enabled) {
      return;
    }

    if (event.nativeEvent.actionName === 'increment') {
      onSeekBy(SEEK_STEP_SECONDS);
    }

    if (event.nativeEvent.actionName === 'decrement') {
      onSeekBy(-SEEK_STEP_SECONDS);
    }
  };

  return (
    <View style={[styles.row, !enabled && styles.disabled]}>
      <Text
        testID="player-elapsed"
        accessible={false}
        numberOfLines={1}
        maxFontSizeMultiplier={MAX_BAR_TEXT_SCALE}
        style={[
          styles.time,
          { lineHeight: lineHeightFor('text-xs', 'leading-normal', scale) }
        ]}>
        {formatDuration(shownElapsed)}
      </Text>
      <View
        testID="player-seek"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('playerBar.position')}
        accessibilityState={{ disabled: !enabled }}
        accessibilityValue={{
          min: 0,
          max: duration,
          now: shownElapsed,
          text: t('playerBar.positionValue', {
            elapsed: formatDuration(shownElapsed),
            duration: formatDuration(duration)
          })
        }}
        accessibilityActions={
          enabled
            ? [
                {
                  name: 'increment',
                  label: t('playerBar.seekForward')
                },
                {
                  name: 'decrement',
                  label: t('playerBar.seekBackward')
                }
              ]
            : []
        }
        onAccessibilityAction={onAccessibilityAction}
        style={styles.rail}
        onLayout={event => {
          width.current = event.nativeEvent.layout.width;
        }}
        onStartShouldSetResponder={() => enabled}
        onMoveShouldSetResponder={() => enabled}
        onResponderGrant={start}
        onResponderMove={move}
        onResponderRelease={end}
        onResponderTerminate={end}
        onResponderTerminationRequest={() => false}>
        <View pointerEvents="none" style={styles.track}>
          <View style={[styles.fill, { width: `${shownFraction * 100}%` }]} />
        </View>
        <View
          pointerEvents="none"
          style={[styles.knob, { left: `${shownFraction * 100}%` }]}
        />
      </View>
      <Text
        testID="player-duration"
        accessible={false}
        numberOfLines={1}
        maxFontSizeMultiplier={MAX_BAR_TEXT_SCALE}
        style={[
          styles.time,
          { lineHeight: lineHeightFor('text-xs', 'leading-normal', scale) }
        ]}>
        {formatDuration(duration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2')
  },
  disabled: {
    opacity: tokenNumber('opacity-disabled')
  },
  time: {
    minWidth: tokenLength('space-9'),
    color: tokenColor('muted-on-art'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    textAlign: 'center'
  },
  rail: {
    flex: 1,
    height: touchTarget,
    justifyContent: 'center'
  },
  track: {
    /* A 3pt track keeps the rail's visual weight without a layout jump. */
    height: 3,
    overflow: 'hidden',
    borderRadius: tokenLength('focus-width'),
    backgroundColor: tokenColor('muted-on-art')
  },
  fill: {
    height: '100%',
    backgroundColor: tokenColor('accent')
  },
  knob: {
    position: 'absolute',
    top: '50%',
    width: tokenLength('space-2'),
    height: tokenLength('space-2'),
    marginTop: -tokenLength('space-1'),
    marginLeft: -tokenLength('space-1'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('ink')
  }
});
