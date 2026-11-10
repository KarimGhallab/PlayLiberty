import { Pressable, StyleSheet, Text } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import {
  fontFamily,
  tokenColor,
  tokenLength,
  touchTarget
} from '../../styles/tokens/tokens';
import Screen from '../Screen/Screen';

export interface NotFoundProps {
  readonly onBack: () => void;
}

/** An unknown path's body: one sentence and one way home. */
export default function NotFound({ onBack }: NotFoundProps) {
  const { t } = useI18n();

  return (
    <Screen
      title={t('notFoundPage.heading')}
      subtitle={t('notFoundPage.prose')}>
      <Pressable
        accessibilityRole="button"
        style={styles.back}
        onPress={onBack}>
        <Text style={styles.label}>{t('notFoundPage.back')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-4'),
    borderRadius: tokenLength('radius-control'),
    borderWidth: 1,
    borderColor: tokenColor('control-border')
  },
  label: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md')
  }
});
