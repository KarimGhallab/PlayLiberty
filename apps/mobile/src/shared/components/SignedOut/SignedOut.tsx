import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../styles/tokens';
import SignInDoor from '../SignInDoor/SignInDoor';
import Spinner from '../Spinner/Spinner';

export interface SignedOutProps {
  readonly busy: boolean;
  readonly failure: string | null;
  readonly actionLabel?: string;
  readonly onSignIn: () => void;
}

/** The one screen a person sees before provisioning, with its one action. */
export default function SignedOut({
  busy,
  failure,
  actionLabel,
  onSignIn
}: SignedOutProps) {
  const { t } = useI18n();
  const label = busy
    ? t('signedOut.busy')
    : (actionLabel ?? t('signedOut.action'));

  return (
    <SignInDoor
      busy={busy}
      action={
        <View style={styles.action}>
          {failure === null ? null : (
            <View
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={styles.failure}>
              <Text style={styles.failureText}>{failure}</Text>
            </View>
          )}
          <Pressable
            testID="sign-in"
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            style={({ pressed }) => [
              styles.primary,
              pressed && styles.primaryPressed
            ]}
            onPress={onSignIn}>
            {busy ? <Spinner color={tokenColor('bg')} /> : null}
            <Text style={styles.label}>{label}</Text>
            {busy ? null : <Text style={styles.arrow}>↗</Text>}
          </Pressable>
        </View>
      }>
      <Text accessibilityRole="header" style={styles.title}>
        {t('signedOut.title')}
      </Text>
      <Text style={styles.hint}>{t('signedOut.browser')}</Text>
    </SignInDoor>
  );
}

const styles = StyleSheet.create({
  action: {
    width: '100%',
    gap: tokenLength('space-3')
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokenLength('space-2'),
    minHeight: touchTarget,
    minWidth: touchTarget,
    paddingHorizontal: tokenLength('space-5'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('accent')
  },
  primaryPressed: {
    backgroundColor: tokenColor('accent-hover')
  },
  label: {
    color: tokenColor('bg'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: '500'
  },
  arrow: {
    color: tokenColor('bg'),
    fontFamily,
    fontSize: tokenLength('text-md')
  },
  title: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-lg'),
    fontWeight: '500',
    lineHeight: tokenLength('text-lg') * tokenNumber('leading-tight'),
    textAlign: 'center',
    width: '100%'
  },
  hint: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    lineHeight: tokenLength('text-xs') * tokenNumber('leading-normal'),
    textAlign: 'center',
    width: '100%'
  },
  failure: {
    width: '100%',
    padding: tokenLength('space-3'),
    borderLeftWidth: 2,
    borderLeftColor: tokenColor('tone-failed'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('surface')
  },
  failureText: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  }
});
