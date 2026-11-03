import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { UserRole } from '@playliberty/contracts';
import { problemDetail, useI18n } from '@playliberty/i18n';

import AccountSheet from '../../../shared/components/AccountSheet/AccountSheet';
import Screen from '../../../shared/components/Screen/Screen';
import SignInDoor from '../../../shared/components/SignInDoor/SignInDoor';
import SignedOut from '../../../shared/components/SignedOut/SignedOut';

import { ApiError } from '../../../api/apiClient/ApiClient';
import { useAccount } from '../../../api/useAccount';
import { provisioningFailure } from '../../../auth/provisioningFailure';
import { startProvisioning } from '../../../auth/startProvisioning';
import { useApiConfig } from '../../../auth/useApiConfig';
import { SessionStatus, useSession } from '../../../auth/useSession';
import LibraryScreen from '../LibraryScreen/LibraryScreen';

/*
 * The gallery's shell, shared by the root and the bare-track route: the session
 * gate, the account sheet and the library body are one surface.
 */
export default function LibraryShell() {
  const { t } = useI18n();
  const { status, signOut } = useSession();
  const config = useApiConfig();
  const [accountOpen, setAccountOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const {
    data: account,
    error: accountError,
    isPending: accountPending
  } = useAccount(status === SessionStatus.SignedIn);
  const readFailure =
    accountError instanceof ApiError
      ? problemDetail(t, accountError.problem)
      : null;

  const signIn = useCallback(async () => {
    setBusy(true);
    setFailure(null);

    try {
      await startProvisioning();
    } catch (error) {
      setFailure(provisioningFailure(t, error));
    } finally {
      setBusy(false);
    }
  }, [t]);

  if (status === SessionStatus.Loading) {
    return <SignInDoor />;
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
    <Screen>
      <LibraryScreen
        account={account ?? null}
        config={config}
        isAdmin={account?.role === UserRole.Admin}
        onOpenAccount={() => setAccountOpen(true)}
        onOpenEgress={() => {
          router.push('/egress');
        }}
        onOpenPlaylist={playlistId => {
          router.push({
            pathname: '/playlists/[playlistId]',
            params: { playlistId }
          });
        }}
      />

      <AccountSheet
        visible={accountOpen}
        account={account ?? null}
        loading={accountPending}
        failure={readFailure}
        onClose={() => setAccountOpen(false)}
        onSignOut={() => {
          setAccountOpen(false);
          signOut();
        }}
      />
    </Screen>
  );
}
