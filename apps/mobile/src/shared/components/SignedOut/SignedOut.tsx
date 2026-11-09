import { IconArrowUpRight } from '@tabler/icons-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import { useAnnouncement } from '../../a11y/useAnnouncement/useAnnouncement';
import { lineHeightFor, useTextScale } from '../../styles/textMetrics';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenWeight,
  touchTarget
} from '../../styles/tokens/tokens';
import SignInDoor from '../SignInDoor/SignInDoor';
import Spinner from '../Spinner';

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
  const scale = useTextScale();
  const liveRegion = useAnnouncement(failure);
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
              accessibilityLiveRegion={liveRegion}
              style={styles.failure}>
              <Text
                style={[
                  styles.failureText,
                  {
                    lineHeight: lineHeightFor(
                      'text-sm',
                      'leading-normal',
                      scale
                    )
                  }
                ]}>
                {failure}
              </Text>
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
            {busy ? null : (
              <IconArrowUpRight
                size={tokenLength('icon-sm')}
                color={tokenColor('bg')}
              />
            )}
          </Pressable>
        </View>
      }>
      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          { lineHeight: lineHeightFor('text-lg', 'leading-tight', scale) }
        ]}>
        {t('signedOut.title')}
      </Text>
      <Text
        style={[
          styles.hint,
          { lineHeight: lineHeightFor('text-xs', 'leading-normal', scale) }
        ]}>
        {t('signedOut.browser')}
      </Text>
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
    fontWeight: tokenWeight('weight-medium')
  },
  title: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-lg'),
    fontWeight: tokenWeight('weight-medium'),
    textAlign: 'center',
    width: '100%'
  },
  hint: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    textAlign: 'center',
    width: '100%'
  },
  failure: {
    width: '100%',
    padding: tokenLength('space-3'),
    borderWidth: 1,
    borderColor: tokenColor('line'),
    borderRadius: tokenLength('radius-card'),
    backgroundColor: tokenColor('surface')
  },
  failureText: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  }
});
