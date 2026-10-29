import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { problemDetail, useI18n } from '@playliberty/i18n';

import AccountSheet from '../src/shared/components/AccountSheet/AccountSheet';
import Screen from '../src/shared/components/Screen/Screen';
import {
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../src/shared/styles/tokens';

import { apiBaseUrl } from '../src/api/apiBaseUrl';
import { ApiError } from '../src/api/apiClient/ApiClient';
import { useAccount } from '../src/api/useAccount';
import {
  expoProvisioningDeps,
  provisioningRedirectUris
} from '../src/auth/expoProvisioning';
import {
  ProvisioningError,
  beginProvisioning
} from '../src/auth/provisioning/provisioning';
import { tokenStore } from '../src/auth/tokenStore';
import { SessionStatus, useSession } from '../src/auth/useSession';

export default function LibraryRoute() {
  const { t } = useI18n();
  const { status, refresh } = useSession();
  const [accountOpen, setAccountOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const { data: account, error: accountError } = useAccount(
    status === SessionStatus.SignedIn
  );
  const readFailure =
    accountError instanceof ApiError
      ? problemDetail(t, accountError.problem)
      : null;

  const signIn = useCallback(async () => {
    setBusy(true);
    setFailure(null);

    try {
      await beginProvisioning({
        baseUrl: apiBaseUrl(),
        redirectUris: provisioningRedirectUris(),
        deps: expoProvisioningDeps
      });
    } catch (error) {
      setFailure(
        error instanceof ProvisioningError
          ? (problemDetail(t, error.problem) ?? t('signedOut.failed'))
          : t('signedOut.failed')
      );
    } finally {
      setBusy(false);
    }
  }, [t]);

  if (status === SessionStatus.Loading) {
    return <Screen title={t('app.name')} subtitle={t('library.loading')} />;
  }

  if (status === SessionStatus.SignedOut) {
    return (
      <Screen title={t('signedOut.title')} subtitle={t('signedOut.body')}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          style={[styles.action, busy && styles.actionDisabled]}
          onPress={() => {
            void signIn();
          }}>
          <Text style={styles.actionLabel}>
            {busy ? t('signedOut.busy') : t('signedOut.action')}
          </Text>
        </Pressable>
        {failure === null ? null : (
          <Text style={styles.failure}>{failure}</Text>
        )}
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
        account={account ?? null}
        failure={readFailure}
        onClose={() => setAccountOpen(false)}
        onSignOut={() => {
          void tokenStore.clear().then(refresh);
        }}
        onOpenEgress={() => {
          setAccountOpen(false);
          router.push('/egress');
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
  actionDisabled: {
    opacity: tokenNumber('opacity-disabled')
  },
  actionLabel: {
    color: tokenColor('ink'),
    fontSize: tokenLength('text-md')
  },
  failure: {
    color: tokenColor('tone-failed'),
    fontSize: tokenLength('text-sm')
  }
});
