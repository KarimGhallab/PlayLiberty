import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useCurrentAccount } from '@playliberty/api-client';
import { UserRole } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import NotFound from '../../../shared/components/NotFound/NotFound';
import Screen from '../../../shared/components/Screen/Screen';
import Spinner from '../../../shared/components/Spinner/Spinner';
import { tokenColor } from '../../../shared/styles/tokens';

import { SessionStatus } from '../../../auth/sessionStore/sessionStore';
import { useSession } from '../../../auth/useSession';
import EgressScreen from '../EgressScreen/EgressScreen';

/* The console is operator information: the account read's role is the door,
 * and everyone else gets the same not-found body a missing route would give. */
export default function EgressGate() {
  const { t } = useI18n();
  const { status } = useSession();
  const account = useCurrentAccount(status === SessionStatus.SignedIn);
  const back = (): void => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  if (status === SessionStatus.Loading) {
    return (
      <Screen
        testID="egress-gate-loading"
        title={t('egress.title')}
        onBack={back}
        backLabel={t('common.back')}>
        <View style={styles.loading}>
          <Spinner color={tokenColor('muted')} />
        </View>
      </Screen>
    );
  }

  if (status === SessionStatus.SignedOut) {
    return <NotFound onBack={back} />;
  }

  if (account.isPending) {
    return (
      <Screen
        testID="egress-gate-loading"
        title={t('egress.title')}
        onBack={back}
        backLabel={t('common.back')}>
        <View style={styles.loading}>
          <Spinner color={tokenColor('muted')} />
        </View>
      </Screen>
    );
  }

  if (account.data?.role !== UserRole.Admin) {
    return <NotFound onBack={back} />;
  }

  return <EgressScreen onBack={back} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
