import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { problemDetail, useI18n } from '@playliberty/i18n';

import Screen from '../shared/components/Screen/Screen';

import { expoProvisioningDeps } from './expoProvisioning';
import {
  ProvisioningError,
  completeProvisioning
} from './provisioning/provisioning';
import { tokenStore } from './tokenStore';

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

        setFailure(
          error instanceof ProvisioningError
            ? (problemDetail(t, error.problem) ?? t('signedOut.failed'))
            : t('signedOut.failed')
        );
      });

    return () => {
      active = false;
    };
  }, [code, state, t]);

  return (
    <Screen title={t('app.name')} subtitle={failure ?? t('signedOut.busy')} />
  );
}
