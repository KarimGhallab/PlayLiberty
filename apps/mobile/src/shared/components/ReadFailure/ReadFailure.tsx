import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../styles/tokens';

export interface ReadFailureProps {
  readonly message: string;
  readonly retrying: boolean;
  readonly onRetry: () => void;
}

/* A blocking read that failed, and the one way back: the problem's sentence and
 * a retry that refetches the read that failed, never a reload. */
export default function ReadFailure({
  message,
  retrying,
  onRetry
}: ReadFailureProps) {
  const { t } = useI18n();

  return (
    <View style={styles.failure}>
      <Text
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={styles.message}>
        {message}
      </Text>
      <Pressable
        testID="read-failure-retry"
        accessibilityRole="button"
        accessibilityState={{ disabled: retrying, busy: retrying }}
        disabled={retrying}
        style={({ pressed }) => [
          styles.retry,
          pressed && styles.retryPressed,
          retrying && styles.retryDisabled
        ]}
        onPress={onRetry}>
        <Text style={styles.retryLabel}>
          {retrying ? t('readFailure.retrying') : t('readFailure.retry')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  failure: {
    flex: 1,
    justifyContent: 'center',
    gap: tokenLength('space-3')
  },
  message: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    lineHeight: tokenLength('text-md') * tokenNumber('leading-normal'),
    textAlign: 'center'
  },
  retry: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-5'),
    borderRadius: tokenLength('radius-control'),
    borderWidth: 1,
    borderColor: tokenColor('control-border')
  },
  retryPressed: {
    backgroundColor: tokenColor('surface-raised')
  },
  retryDisabled: {
    opacity: tokenNumber('opacity-disabled')
  },
  retryLabel: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md')
  }
});
