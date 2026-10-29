import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { type Account, UserRole } from '@playliberty/contracts';
import { Language, useI18n } from '@playliberty/i18n';

import { useReduceMotion } from '../../a11y/useReduceMotion';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  touchTarget
} from '../../styles/tokens';

export interface AccountSheetProps {
  readonly visible: boolean;
  readonly account: Account | null;
  readonly failure: string | null;
  readonly onClose: () => void;
  readonly onSignOut: () => void;
  readonly onOpenEgress: () => void;
}

const LANGUAGES = [
  { value: Language.English, label: 'language.english' },
  { value: Language.French, label: 'language.french' }
] as const;

/* The app's one settings surface. The egress door is drawn from the account's
 * role, so a normal account is never offered a screen it cannot use. */

export default function AccountSheet({
  visible,
  account,
  failure,
  onClose,
  onSignOut,
  onOpenEgress
}: AccountSheetProps) {
  const { t, language, setLanguage } = useI18n();
  const reduceMotion = useReduceMotion();
  const isAdmin = account?.role === UserRole.Admin;

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

          {account === null ? null : (
            <View style={styles.identity}>
              {account.avatarUrl === null ? null : (
                <Image
                  accessible={false}
                  source={{ uri: account.avatarUrl }}
                  style={styles.avatar}
                  testID="account-avatar"
                />
              )}
              <View style={styles.who}>
                <Text style={styles.name}>{account.displayName}</Text>
                {isAdmin ? (
                  <Text style={styles.mark}>{t('account.admin')}</Text>
                ) : null}
              </View>
            </View>
          )}

          {failure === null ? null : (
            <Text style={styles.failure}>{failure}</Text>
          )}

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

          {isAdmin ? (
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              onPress={onOpenEgress}>
              <Text style={styles.actionLabel}>{t('account.egress')}</Text>
            </Pressable>
          ) : null}

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
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3')
  },
  avatar: {
    width: tokenLength('space-8'),
    height: tokenLength('space-8'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  who: {
    flexShrink: 1,
    gap: tokenLength('space-1')
  },
  name: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: '600'
  },
  mark: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  failure: {
    color: tokenColor('tone-failed'),
    fontFamily,
    fontSize: tokenLength('text-sm')
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
    minWidth: touchTarget,
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
