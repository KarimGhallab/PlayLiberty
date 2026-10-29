import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import AccountSheet from '../src/shared/components/AccountSheet';
import Screen from '../src/shared/components/Screen/Screen';
import {
  tokenColor,
  tokenLength,
  touchTarget
} from '../src/shared/styles/tokens';

import { tokenStore } from '../src/auth/tokenStore';
import { SessionStatus, useSession } from '../src/auth/useSession';

export default function LibraryRoute() {
  const { t } = useI18n();
  const { status, refresh } = useSession();
  const [accountOpen, setAccountOpen] = useState(false);

  if (status === SessionStatus.Loading) {
    return <Screen title={t('app.name')} subtitle={t('library.loading')} />;
  }

  if (status === SessionStatus.SignedOut) {
    return (
      <Screen title={t('signedOut.title')} subtitle={t('signedOut.body')}>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          onPress={() => {
            // Provisioning is spec 20's; the skeleton offers the state only.
          }}>
          <Text style={styles.actionLabel}>{t('signedOut.action')}</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen title={t('app.name')}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('account.title')}
          style={styles.action}
          onPress={() => setAccountOpen(true)}>
          <Text style={styles.actionLabel}>{t('account.title')}</Text>
        </Pressable>
      </View>

      <AccountSheet
        visible={accountOpen}
        onClose={() => setAccountOpen(false)}
        onSignOut={() => {
          void tokenStore.clear().then(refresh);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
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
    fontSize: tokenLength('text-md')
  }
});
