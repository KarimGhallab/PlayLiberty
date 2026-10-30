import {
  IconRefresh,
  IconShieldLock,
  IconUser
} from '@tabler/icons-react-native';
import { useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

import type { Account } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';
import { standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../a11y/useReduceMotion';
import {
  fontFamily,
  tokenColor,
  tokenDuration,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../styles/tokens';
import AccountAvatar from '../AccountAvatar/AccountAvatar';
import Spinner from '../Spinner/Spinner';

export interface LibrarySync {
  readonly count: number;
  readonly busy: boolean;
  readonly onPress: () => void;
}

export interface LibraryHeaderProps {
  readonly account: Account | null;
  readonly isAdmin: boolean;
  readonly sync: LibrarySync;
  readonly onOpenAccount: () => void;
  readonly onOpenEgress: () => void;
}

/* The library's chrome: the compact app name, the bulk sync as a full-sentence
 * button, and the two doors. The count takes the room the smaller title frees. */
export default function LibraryHeader({
  account,
  isAdmin,
  sync,
  onOpenAccount,
  onOpenEgress
}: LibraryHeaderProps) {
  const { t } = useI18n();
  const reduceMotion = useReduceMotion();
  const press = useRef(new Animated.Value(0)).current;
  const syncLabel = sync.busy
    ? t('library.syncingAll', { count: sync.count })
    : t('library.syncAll', { count: sync.count });
  const pressed = {
    opacity: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }),
    transform: [
      {
        scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] })
      }
    ]
  };

  /* A press lands on the account's face: it shrinks under the thumb and comes
   * back on release, on the fast end of the one curve. */
  const pressTo = (to: number): void => {
    if (reduceMotion) {
      press.setValue(to);
      return;
    }

    Animated.timing(press, {
      toValue: to,
      duration: tokenDuration('motion-fast'),
      easing: Easing.bezier(...standardEasingBezier),
      useNativeDriver: true
    }).start();
  };

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
            accessibilityLabel={t('account.egress')}
            style={({ pressed: isPressed }) => [
              styles.egress,
              isPressed && styles.egressPressed
            ]}
            onPress={onOpenEgress}>
            <IconShieldLock
              size={tokenLength('icon-md')}
              color={tokenColor('ink')}
            />
          </Pressable>
        ) : null}
        {sync.count === 0 ? null : (
          <Pressable
            testID="bulk-sync"
            accessibilityRole="button"
            accessibilityLabel={syncLabel}
            accessibilityState={{ disabled: sync.busy, busy: sync.busy }}
            disabled={sync.busy}
            style={styles.sync}
            onPress={sync.onPress}>
            {sync.busy ? (
              <Spinner color={tokenColor('accent')} />
            ) : (
              <IconRefresh
                size={tokenLength('icon-sm')}
                color={tokenColor('accent')}
              />
            )}
            <Text numberOfLines={1} style={styles.syncLabel}>
              {syncLabel}
            </Text>
          </Pressable>
        )}
        <Pressable
          testID="account-door"
          accessibilityRole="button"
          accessibilityLabel={t('account.title')}
          style={styles.account}
          onPressIn={() => pressTo(1)}
          onPressOut={() => pressTo(0)}
          onPress={onOpenAccount}>
          <Animated.View style={pressed}>
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
          </Animated.View>
        </Pressable>
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
    fontSize: tokenLength('text-md'),
    fontWeight: '600',
    lineHeight: tokenLength('text-md') * tokenNumber('leading-tight')
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
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control')
  },
  egressPressed: {
    backgroundColor: tokenColor('surface')
  },
  sync: {
    height: touchTarget,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2'),
    paddingHorizontal: tokenLength('space-2'),
    borderWidth: 1,
    borderColor: tokenColor('accent'),
    borderRadius: tokenLength('radius-control')
  },
  syncLabel: {
    flexShrink: 1,
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '600'
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
