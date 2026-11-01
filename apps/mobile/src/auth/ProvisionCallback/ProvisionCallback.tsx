import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import SignInDoor from '../../shared/components/SignInDoor/SignInDoor';
import SignedOut from '../../shared/components/SignedOut/SignedOut';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber
} from '../../shared/styles/tokens';

import { expoProvisioningDeps } from '../expoProvisioning';
import { completeProvisioning } from '../provisioning/provisioning';
import { provisioningFailure } from '../provisioningFailure';
import {
  recordFromToken,
  sessionRecordStore
} from '../sessionRecord/sessionRecord';
import { startProvisioning } from '../startProvisioning';

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
      .then(token =>
        sessionRecordStore.write(recordFromToken(token, Date.now()))
      )
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
    return (
      <SignInDoor busy>
        <Text accessibilityLiveRegion="polite" style={styles.waiting}>
          {t('signedOut.busy')}
        </Text>
      </SignInDoor>
    );
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

const styles = StyleSheet.create({
  waiting: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    lineHeight: tokenLength('text-md') * tokenNumber('leading-normal'),
    textAlign: 'center',
    width: '100%'
  }
});
