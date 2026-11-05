import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@playliberty/i18n';

import { useAnnouncement } from '../../a11y/useAnnouncement';
import { useReduceMotion } from '../../a11y/useReduceMotion';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../styles/tokens';

/* One accessibility action buys this much more time. */
const EXTEND_MS = 5000;

/* A touch event's timestamp is milliseconds since boot, the same clock
 * `performance.now()` reads; the window is decided on it, not on which callback
 * the thread happened to run first. */
function now(): number {
  return performance.now();
}

export interface UndoSnackbarProps {
  readonly message: string;
  readonly detail: string;
  /** Called when the window truly ends and the request should commit. */
  readonly onExpire: () => void;
  readonly onUndo: () => void;
  /** The deferred window, which the remaining bar counts down. */
  readonly durationMs: number;
  readonly bottomOffset?: number;
  /** Matches a padded parent's inset where the snackbar is full bleed. */
  readonly horizontalInset?: number;
}

/* A deferred action's surface: the sentence, the subject, the countdown, and
 * the one control that stops the request. Holding the surface, or asking for
 * more time from the screen reader, moves the commit later. */
export default function UndoSnackbar({
  message,
  detail,
  onExpire,
  onUndo,
  durationMs,
  bottomOffset = 0,
  horizontalInset = 0
}: UndoSnackbarProps) {
  const { t } = useI18n();
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const remaining = useRef(new Animated.Value(1)).current;
  const liveRegion = useAnnouncement(
    detail.length === 0 ? message : `${message}. ${detail}`
  );
  const expire = useRef(onExpire);
  expire.current = onExpire;
  const quiet = useRef(reduceMotion);
  quiet.current = reduceMotion;
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdown = useRef<Animated.CompositeAnimation | null>(null);
  const remainingMs = useRef(durationMs);
  const startedAt = useRef(0);
  const deadline = useRef(0);
  const pressedAt = useRef(0);
  const paused = useRef(false);
  const alive = useRef(true);

  const start = useCallback(
    (ms: number): void => {
      if (!alive.current) {
        return;
      }

      if (timeout.current !== null) {
        clearTimeout(timeout.current);
        timeout.current = null;
      }

      if (ms <= 0) {
        expire.current();
        return;
      }

      remainingMs.current = ms;
      startedAt.current = now();
      deadline.current = startedAt.current + ms;
      paused.current = false;

      if (!quiet.current) {
        countdown.current?.stop();
        remaining.setValue(Math.min(1, ms / durationMs));
        const animation = Animated.timing(remaining, {
          toValue: 0,
          duration: ms,
          easing: Easing.linear,
          useNativeDriver: true
        });

        countdown.current = animation;
        animation.start();
      }

      timeout.current = setTimeout(() => {
        timeout.current = null;
        expire.current();
      }, ms);
    },
    [durationMs, remaining]
  );

  useEffect(() => {
    alive.current = true;
    pressedAt.current = 0;
    start(durationMs);

    return () => {
      alive.current = false;

      if (timeout.current !== null) {
        clearTimeout(timeout.current);
        timeout.current = null;
      }

      countdown.current?.stop();
      countdown.current = null;
    };
  }, [durationMs, remaining, start]);

  const pause = useCallback((): void => {
    if (!alive.current || paused.current) {
      return;
    }

    paused.current = true;

    if (timeout.current !== null) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }

    remainingMs.current = Math.max(
      0,
      remainingMs.current - (now() - startedAt.current)
    );
    countdown.current?.stop();
    countdown.current = null;
  }, []);

  const resume = useCallback((): void => {
    if (!alive.current || !paused.current) {
      return;
    }

    start(remainingMs.current);
  }, [start]);

  const extend = useCallback((): void => {
    if (!alive.current) {
      return;
    }

    const left = paused.current
      ? remainingMs.current
      : Math.max(0, remainingMs.current - (now() - startedAt.current));

    start(left + EXTEND_MS);
  }, [start]);

  /* A press whose gesture began inside the window is honoured even if the
   * timer has already fired; a press outside it is not an undo. */
  const undo = (): void => {
    const at = pressedAt.current === 0 ? now() : pressedAt.current;

    if (at <= deadline.current) {
      onUndo();
    }
  };

  const onAccessibilityAction = (event: {
    readonly nativeEvent: { readonly actionName: string };
  }): void => {
    if (event.nativeEvent.actionName === 'extend') {
      extend();
    }
  };

  return (
    <View
      testID="undo-snackbar"
      onTouchStart={event => {
        const timestamp = event?.nativeEvent?.timestamp;

        if (typeof timestamp === 'number') {
          pressedAt.current = timestamp;
        }

        pause();
      }}
      onTouchEnd={resume}
      onTouchCancel={resume}
      style={[
        styles.snackbar,
        {
          bottom: insets.bottom + tokenLength('space-4') + bottomOffset,
          left: horizontalInset,
          right: horizontalInset
        }
      ]}>
      <View style={styles.content}>
        <View
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion={liveRegion}
          accessibilityActions={[
            { name: 'extend', label: t('common.moreTime') }
          ]}
          onAccessibilityAction={onAccessibilityAction}
          testID="undo-snackbar-body"
          style={styles.body}>
          <Text numberOfLines={1} style={styles.message}>
            {message}
          </Text>
          <Text numberOfLines={1} style={styles.detail}>
            {detail}
          </Text>
        </View>
        <Pressable
          testID="undo-snackbar-action"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.action,
            pressed && styles.actionPressed
          ]}
          onPress={undo}>
          <Text style={styles.actionLabel}>{t('common.undo')}</Text>
        </Pressable>
      </View>
      {reduceMotion ? null : (
        <Animated.View
          testID="undo-snackbar-remaining"
          pointerEvents="none"
          style={[styles.remaining, { transform: [{ scaleX: remaining }] }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-card'),
    backgroundColor: tokenColor('surface-raised')
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3'),
    padding: tokenLength('space-3')
  },
  body: {
    flex: 1,
    gap: tokenLength('space-1')
  },
  message: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-semibold'),
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  },
  detail: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    lineHeight: tokenLength('text-xs') * tokenNumber('leading-normal')
  },
  action: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-3'),
    borderRadius: tokenLength('radius-control')
  },
  actionPressed: {
    backgroundColor: tokenColor('surface')
  },
  actionLabel: {
    color: tokenColor('accent'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-semibold')
  },
  remaining: {
    height: 2,
    width: '100%',
    transformOrigin: 'left',
    backgroundColor: tokenColor('accent')
  }
});
