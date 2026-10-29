import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Language, useI18n } from '@playliberty/i18n';

import { useReduceMotion } from '../a11y/useReduceMotion';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  touchTarget
} from '../styles/tokens';

export interface AccountSheetProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSignOut: () => void;
}

const LANGUAGES = [
  { value: Language.English, label: 'language.english' },
  { value: Language.French, label: 'language.french' }
] as const;

/* The app's one settings surface. Sign out forgets the token on the device; the
 * edge has no revocation call in this app's scope. */

export default function AccountSheet({
  visible,
  onClose,
  onSignOut
}: AccountSheetProps) {
  const { t, language, setLanguage } = useI18n();
  const reduceMotion = useReduceMotion();

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType={reduceMotion ? 'none' : 'slide'}
      transparent>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('account.title')}
          </Text>

          <Text style={styles.label}>{t('language.label')}</Text>
          <View style={styles.row}>
            {LANGUAGES.map(option => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: language === option.value }}
                style={styles.action}
                onPress={() => setLanguage(option.value)}>
                <Text style={styles.actionLabel}>{t(option.label)}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            style={styles.action}
            onPress={onSignOut}>
            <Text style={styles.actionLabel}>{t('account.signOut')}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={styles.action}
            onPress={onClose}>
            <Text style={styles.actionLabel}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: tokenColor('scrim')
  },
  sheet: {
    gap: tokenLength('space-3'),
    padding: tokenLength('space-5'),
    borderTopLeftRadius: tokenLength('radius-card'),
    borderTopRightRadius: tokenLength('radius-card'),
    backgroundColor: tokenColor('surface')
  },
  title: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-lg'),
    fontWeight: '600'
  },
  label: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  row: {
    flexDirection: 'row',
    gap: tokenLength('space-2')
  },
  action: {
    minHeight: touchTarget,
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-4'),
    borderRadius: tokenLength('radius-control'),
    borderWidth: 1,
    borderColor: tokenColor('control-border')
  },
  actionLabel: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md')
  }
});
