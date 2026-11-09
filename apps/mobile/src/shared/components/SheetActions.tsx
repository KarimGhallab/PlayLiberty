import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import { useAnnouncement } from '../a11y/useAnnouncement/useAnnouncement';
import { lineHeightFor, useTextScale } from '../styles/textMetrics';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../styles/tokens/tokens';
import Spinner from './Spinner';

export interface SheetActionsProps {
  readonly testIDPrefix: string;
  readonly busy: boolean;
  /* Whether the primary action has everything it needs. */
  readonly canSubmit: boolean;
  readonly addLabel: string;
  readonly addingLabel: string;
  /* The prompt and its pair replace the actions until the doubt is settled. */
  readonly confirmingDiscard: boolean;
  readonly onAdd: () => void;
  readonly onCancel: () => void;
  readonly onDiscard: () => void;
  readonly onKeepEditing: () => void;
}

/* The one footer for the sheets that submit a link: the prompt that guards a
 * typed link, then Cancel and the primary action with its wait. */
export default function SheetActions({
  testIDPrefix,
  busy,
  canSubmit,
  addLabel,
  addingLabel,
  confirmingDiscard,
  onAdd,
  onCancel,
  onDiscard,
  onKeepEditing
}: SheetActionsProps) {
  const { t } = useI18n();
  const scale = useTextScale();
  const liveRegion = useAnnouncement(
    confirmingDiscard ? t('common.discardPrompt') : null
  );

  if (confirmingDiscard) {
    return (
      <>
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion={liveRegion}
          style={[
            styles.discard,
            { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
          ]}>
          {t('common.discardPrompt')}
        </Text>
        <View style={styles.actions}>
          <Pressable
            testID={`${testIDPrefix}-keep-editing`}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.secondary,
              pressed && styles.secondaryPressed
            ]}
            onPress={onKeepEditing}>
            <Text style={styles.secondaryLabel}>{t('common.keepEditing')}</Text>
          </Pressable>
          <Pressable
            testID={`${testIDPrefix}-discard`}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primary,
              pressed && styles.primaryPressed
            ]}
            onPress={onDiscard}>
            <Text style={styles.primaryLabel}>{t('common.discard')}</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const disabled = busy || !canSubmit;

  return (
    <View style={styles.actions}>
      <Pressable
        testID={`${testIDPrefix}-cancel`}
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        style={({ pressed }) => [
          styles.secondary,
          pressed && styles.secondaryPressed,
          busy && styles.disabled
        ]}
        onPress={onCancel}>
        <Text style={styles.secondaryLabel}>{t('common.cancel')}</Text>
      </Pressable>
      <Pressable
        testID={`${testIDPrefix}-submit`}
        accessibilityRole="button"
        accessibilityState={{ disabled, busy }}
        disabled={disabled}
        style={({ pressed }) => [
          styles.primary,
          pressed && styles.primaryPressed,
          disabled && styles.disabled
        ]}
        onPress={onAdd}>
        {busy ? <Spinner color={tokenColor('bg')} /> : null}
        <Text style={styles.primaryLabel}>{busy ? addingLabel : addLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  discard: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-medium'),
    marginTop: tokenLength('space-4')
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokenLength('space-2'),
    marginTop: tokenLength('space-5')
  },
  secondary: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-5'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control')
  },
  secondaryPressed: {
    backgroundColor: tokenColor('surface-raised')
  },
  secondaryLabel: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md')
  },
  primary: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokenLength('space-2'),
    paddingHorizontal: tokenLength('space-5'),
    borderWidth: 1,
    borderColor: tokenColor('accent'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('accent')
  },
  primaryPressed: {
    backgroundColor: tokenColor('accent-hover')
  },
  primaryLabel: {
    color: tokenColor('bg'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: tokenWeight('weight-medium')
  },
  disabled: {
    opacity: tokenNumber('opacity-disabled')
  }
});
