import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../styles/tokens';

export interface LibraryHeaderProps {
  readonly isAdmin: boolean;
  readonly onOpenAccount: () => void;
  readonly onOpenEgress: () => void;
}

/** The library's chrome: the account door and, for an admin, the egress door. */
export default function LibraryHeader({
  isAdmin,
  onOpenAccount,
  onOpenEgress
}: LibraryHeaderProps) {
  const { t } = useI18n();

  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.brand}>
        {t('app.name')}
      </Text>
      <View style={styles.actions}>
        {isAdmin ? (
          <Pressable
            testID="egress-door"
            accessibilityRole="button"
            style={styles.action}
            onPress={onOpenEgress}>
            <Text style={styles.label}>{t('account.egress')}</Text>
          </Pressable>
        ) : null}
        <Pressable
          testID="account-door"
          accessibilityRole="button"
          accessibilityLabel={t('account.title')}
          style={styles.action}
          onPress={onOpenAccount}>
          <Text style={styles.label}>{t('account.title')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokenLength('space-2')
  },
  brand: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-xl'),
    fontWeight: '600',
    lineHeight: tokenLength('text-xl') * tokenNumber('leading-tight')
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  label: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md')
  }
});
