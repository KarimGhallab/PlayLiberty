import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useI18n } from '@playliberty/i18n';

import Screen from '../../shared/components/Screen/Screen';
import SignedOut from '../../shared/components/SignedOut/SignedOut';

import { expoProvisioningDeps } from '../expoProvisioning';
import { completeProvisioning } from '../provisioning/provisioning';
import { provisioningFailure } from '../provisioningFailure';
import { startProvisioning } from '../startProvisioning';
import { tokenStore } from '../tokenStore';

/* The app's callback, shared by the scheme route and the HTTPS App Link: it
 * trades the code before returning to the library, so the deep link never lands
 * on the not-found page. */
export default function ProvisionCallback() {
  const { t } = useI18n();
  const { code, state } = useLocalSearchParams<{
    code?: string;
    state?: string;
  }>();
  const [failure, setFailure] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (code === undefined || state === undefined) {
      setFailure(t('signedOut.failed'));
      return;
    }

    let active = true;

    void completeProvisioning({ code, state }, expoProvisioningDeps)
      .then(token => tokenStore.write(token))
      .then(() => {
        if (active) {
          router.replace('/');
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setFailure(provisioningFailure(t, error));
      });

    return () => {
      active = false;
    };
  }, [code, state, t]);

  const retry = useCallback(async () => {
    setRetrying(true);

    try {
      await startProvisioning();
    } catch (error) {
      setFailure(provisioningFailure(t, error));
    } finally {
      setRetrying(false);
    }
  }, [t]);

  if (failure === null) {
    return <Screen title={t('app.name')} subtitle={t('signedOut.busy')} />;
  }

  return (
    <SignedOut
      busy={retrying}
      failure={failure}
      actionLabel={t('signedOut.retry')}
      onSignIn={() => {
        void retry();
      }}
    />
  );
}
