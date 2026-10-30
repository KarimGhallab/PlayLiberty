import { useEffect, useRef } from 'react';
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

import { useReduceMotion } from '../../a11y/useReduceMotion';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../styles/tokens';

export interface UndoSnackbarProps {
  readonly message: string;
  readonly detail: string;
  readonly onUndo: () => void;
  /** The deferred window, which the remaining bar counts down. */
  readonly durationMs: number;
  readonly bottomOffset?: number;
}

/* A deferred action's surface: the sentence, the subject, the countdown, and
 * the one control that stops the request. It is interactive, unlike the
 * passive notice. */
export default function UndoSnackbar({
  message,
  detail,
  onUndo,
  durationMs,
  bottomOffset = 0
}: UndoSnackbarProps) {
  const { t } = useI18n();
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const remaining = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      remaining.setValue(1);
      return;
    }

    remaining.setValue(1);
    const countdown = Animated.timing(remaining, {
      toValue: 0,
      duration: durationMs,
      easing: Easing.linear,
      useNativeDriver: true
    });

    countdown.start();

    return () => countdown.stop();
  }, [durationMs, reduceMotion, remaining]);

  return (
    <View
      testID="undo-snackbar"
      style={[
        styles.snackbar,
        { bottom: insets.bottom + tokenLength('space-4') + bottomOffset }
      ]}>
      <View style={styles.content}>
        <View
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
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
          onPress={onUndo}>
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
    left: 0,
    right: 0,
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
    fontWeight: '600',
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
    fontWeight: '600'
  },
  remaining: {
    height: 2,
    width: '100%',
    transformOrigin: 'left',
    backgroundColor: tokenColor('accent')
  }
});
