import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber
} from '../../styles/tokens';

export interface NoticeProps {
  /** The sentence, naming what was pressed. */
  readonly message: string;
  /** The line under it, saying what happened. */
  readonly detail?: string | null;
  readonly onDismiss: () => void;
  readonly durationMs?: number;
  /** Space the notice must clear under it, such as a floating action. */
  readonly bottomOffset?: number;
}

const DEFAULT_DURATION = 4000;

/* A transient notice with nothing to press: it never blocks and withdraws
 * itself, so a refusal does not grow a control to dismiss it. */
export default function Notice({
  message,
  detail = null,
  onDismiss,
  durationMs = DEFAULT_DURATION,
  bottomOffset = 0
}: NoticeProps) {
  const insets = useSafeAreaInsets();
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useEffect(() => {
    const timer = setTimeout(() => dismiss.current(), durationMs);

    return () => clearTimeout(timer);
  }, [detail, durationMs, message]);

  return (
    <View
      testID="notice"
      pointerEvents="none"
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.notice,
        { bottom: insets.bottom + tokenLength('space-4') + bottomOffset }
      ]}>
      <Text style={styles.message}>{message}</Text>
      {detail === null ? null : <Text style={styles.detail}>{detail}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    position: 'absolute',
    left: 0,
    right: 0,
    gap: tokenLength('space-1'),
    padding: tokenLength('space-3'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-card'),
    backgroundColor: tokenColor('surface-raised')
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
  }
});
