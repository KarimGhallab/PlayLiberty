import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../../shared/styles/tokens';

export interface PlaylistNotFoundProps {
  readonly onBack: () => void;
}

/* A playlist the account cannot see and one that does not exist share one
 * answer, so the body names neither and offers no retry. */
export default function PlaylistNotFound({ onBack }: PlaylistNotFoundProps) {
  const { t } = useI18n();

  return (
    <View testID="playlist-not-found" style={styles.body}>
      <Text accessibilityRole="header" style={styles.heading}>
        {t('notFound.heading')}
      </Text>
      <Text style={styles.prose}>{t('notFound.prose')}</Text>
      <Pressable
        testID="playlist-not-found-back"
        accessibilityRole="button"
        style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        onPress={onBack}>
        <Text style={styles.label}>{t('notFound.back')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokenLength('space-4')
  },
  heading: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-lg'),
    fontWeight: tokenWeight('weight-semibold'),
    textAlign: 'center'
  },
  prose: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    lineHeight: tokenLength('text-md') * tokenNumber('leading-normal'),
    textAlign: 'center'
  },
  back: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-5'),
    borderRadius: tokenLength('radius-control'),
    borderWidth: 1,
    borderColor: tokenColor('control-border')
  },
  backPressed: {
    backgroundColor: tokenColor('surface-raised')
  },
  label: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md')
  }
});
