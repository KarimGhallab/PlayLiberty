import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { problemDetail, useI18n } from '@playliberty/i18n';

import AccountSheet from '../src/shared/components/AccountSheet/AccountSheet';
import LibraryHeader from '../src/shared/components/LibraryHeader/LibraryHeader';
import Screen from '../src/shared/components/Screen/Screen';
import SignedOut from '../src/shared/components/SignedOut/SignedOut';

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
import { SessionStatus, useSession } from '../src/auth/useSession';

export default function LibraryRoute() {
  const { t } = useI18n();
  const { status, signOut } = useSession();
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
      <SignedOut
        busy={busy}
        failure={failure}
        onSignIn={() => {
          void signIn();
        }}
      />
    );
  }

  return (
    <Screen title={t('app.name')}>
      <LibraryHeader onOpenAccount={() => setAccountOpen(true)} />

      <AccountSheet
        visible={accountOpen}
        account={account ?? null}
        failure={readFailure}
        onClose={() => setAccountOpen(false)}
        onSignOut={() => {
          setAccountOpen(false);
          signOut();
        }}
        onOpenEgress={() => {
          setAccountOpen(false);
          router.push('/egress');
        }}
      />
    </Screen>
  );
}
