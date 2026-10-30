import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@playliberty/i18n';

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
  readonly bottomOffset?: number;
}

/* A deferred action's surface: the sentence, the subject, and the one control
 * that stops the request. It is interactive, unlike the passive notice. */
export default function UndoSnackbar({
  message,
  detail,
  onUndo,
  bottomOffset = 0
}: UndoSnackbarProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="undo-snackbar"
      style={[
        styles.snackbar,
        { bottom: insets.bottom + tokenLength('space-4') + bottomOffset }
      ]}>
      <View style={styles.body}>
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.message}>
          {message}
        </Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <Pressable
        testID="undo-snackbar-action"
        accessibilityRole="button"
        style={styles.action}
        onPress={onUndo}>
        <Text style={styles.actionLabel}>{t('common.undo')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3'),
    padding: tokenLength('space-3'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-card'),
    backgroundColor: tokenColor('surface-raised')
  },
  body: {
    flexShrink: 1,
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
    paddingHorizontal: tokenLength('space-3')
  },
  actionLabel: {
    color: tokenColor('accent'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '600'
  }
});
