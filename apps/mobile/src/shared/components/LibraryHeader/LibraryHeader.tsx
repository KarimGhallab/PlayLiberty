import { IconArrowsExchange, IconUser } from '@tabler/icons-react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { Account } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../styles/tokens';
import AccountAvatar from '../AccountAvatar/AccountAvatar';
import PressableScale from '../PressableScale/PressableScale';

export interface LibraryHeaderProps {
  readonly account: Account | null;
  readonly isAdmin: boolean;
  readonly onOpenAccount: () => void;
  readonly onOpenEgress: () => void;
}

/* The library's chrome: the compact app name and the two doors. Every action on
 * the content lives on the content, in the gallery's own dial. */
export default function LibraryHeader({
  account,
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
          <PressableScale
            testID="egress-door"
            accessibilityRole="button"
            accessibilityLabel={t('account.egress')}
            style={styles.egress}
            onPress={onOpenEgress}>
            <IconArrowsExchange
              size={tokenLength('icon-md')}
              color={tokenColor('egress')}
            />
          </PressableScale>
        ) : null}
        <PressableScale
          testID="account-door"
          accessibilityRole="button"
          accessibilityLabel={t('account.title')}
          style={styles.account}
          onPress={onOpenAccount}>
          {account === null ? (
            <View style={styles.accountFallback}>
              <IconUser
                size={tokenLength('icon-sm')}
                color={tokenColor('muted')}
              />
            </View>
          ) : (
            <AccountAvatar account={account} size="sm" />
          )}
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  brand: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-lg'),
    fontWeight: tokenWeight('weight-semibold'),
    lineHeight: tokenLength('text-lg') * tokenNumber('leading-tight')
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-1')
  },
  egress: {
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokenLength('radius-control')
  },
  account: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokenLength('radius-chip')
  },
  accountFallback: {
    width: tokenLength('control-height'),
    height: tokenLength('control-height'),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  }
});
