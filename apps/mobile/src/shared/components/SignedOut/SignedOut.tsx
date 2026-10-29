import { Pressable, StyleSheet, Text } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import {
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../styles/tokens';
import Screen from '../Screen/Screen';

export interface SignedOutProps {
  readonly busy: boolean;
  readonly failure: string | null;
  readonly onSignIn: () => void;
}

/** The one screen a person sees before provisioning, with its one action. */
export default function SignedOut({ busy, failure, onSignIn }: SignedOutProps) {
  const { t } = useI18n();

  return (
    <Screen title={t('signedOut.title')} subtitle={t('signedOut.body')}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        style={[styles.action, busy && styles.actionDisabled]}
        onPress={onSignIn}>
        <Text style={styles.label}>
          {busy ? t('signedOut.busy') : t('signedOut.action')}
        </Text>
      </Pressable>
      {failure === null ? null : <Text style={styles.failure}>{failure}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-4'),
    borderRadius: tokenLength('radius-control'),
    borderWidth: 1,
    borderColor: tokenColor('control-border')
  },
  actionDisabled: {
    opacity: tokenNumber('opacity-disabled')
  },
  label: {
    color: tokenColor('ink'),
    fontSize: tokenLength('text-md')
  },
  failure: {
    color: tokenColor('tone-failed'),
    fontSize: tokenLength('text-sm')
  }
});
