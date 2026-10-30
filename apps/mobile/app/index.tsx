import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { UserRole } from '@playliberty/contracts';
import { problemDetail, useI18n } from '@playliberty/i18n';

import AccountSheet from '../src/shared/components/AccountSheet/AccountSheet';
import LibraryHeader from '../src/shared/components/LibraryHeader/LibraryHeader';
import Screen from '../src/shared/components/Screen/Screen';
import SignInDoor from '../src/shared/components/SignInDoor/SignInDoor';
import SignedOut from '../src/shared/components/SignedOut/SignedOut';

import { ApiError } from '../src/api/apiClient/ApiClient';
import { useAccount } from '../src/api/useAccount';
import { provisioningFailure } from '../src/auth/provisioningFailure';
import { startProvisioning } from '../src/auth/startProvisioning';
import { useApiConfig } from '../src/auth/useApiConfig';
import { SessionStatus, useSession } from '../src/auth/useSession';
import PlaylistGallery from '../src/views/library/PlaylistGallery/PlaylistGallery';

export default function LibraryRoute() {
  const { t } = useI18n();
  const { status, signOut } = useSession();
  const config = useApiConfig();
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
      <LibraryHeader
        isAdmin={account?.role === UserRole.Admin}
        onOpenAccount={() => setAccountOpen(true)}
        onOpenEgress={() => {
          router.push('/egress');
        }}
      />

      <PlaylistGallery
        config={config}
        onAddPlaylist={() => {}}
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
