import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import { tokenColor, tokenLength, touchTarget } from '../../styles/tokens';

export interface LibraryHeaderProps {
  readonly onOpenAccount: () => void;
}

/** The library's only chrome: the door to the account sheet. */
export default function LibraryHeader({ onOpenAccount }: LibraryHeaderProps) {
  const { t } = useI18n();

  return (
    <View style={styles.header}>
      <Pressable
        testID="account-door"
        accessibilityRole="button"
        accessibilityLabel={t('account.title')}
        style={styles.action}
        onPress={onOpenAccount}>
        <Text style={styles.label}>{t('account.title')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
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
    fontSize: tokenLength('text-md')
  }
});
