import { useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { RenamePlaylistInputSchema } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import { useAnnouncement } from '../../../shared/a11y/useAnnouncement';
import Sheet from '../../../shared/components/Sheet/Sheet';
import Spinner from '../../../shared/components/Spinner/Spinner';
import {
  lineHeightFor,
  useTextScale
} from '../../../shared/styles/textMetrics';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../../shared/styles/tokens';

export interface RenameSheetProps {
  readonly visible: boolean;
  readonly currentName: string;
  readonly busy: boolean;
  /* The write's refusal; it shares the field's message slot with the schema. */
  readonly problem: string | null;
  readonly onSubmit: (name: string) => void;
  readonly onClose: () => void;
}

/* One field and one decision. The schema is the client's half of the check; a
 * refusal from the server lands in the same slot, so the sheet says one thing
 * at a time about the same name. */
export default function RenameSheet({
  visible,
  currentName,
  busy,
  problem,
  onSubmit,
  onClose
}: RenameSheetProps) {
  const scale = useTextScale();
  const { t } = useI18n();
  const [name, setName] = useState(currentName);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [wasVisible, setWasVisible] = useState(visible);

  /* A fresh open must not inherit the last edit or refusal. */
  if (visible !== wasVisible) {
    setWasVisible(visible);

    if (visible) {
      setName(currentName);
      setInvalid(null);
    }
  }

  const message = invalid ?? problem;
  const liveRegion = useAnnouncement(message);
  const canSubmit = name.trim().length > 0;

  function submit(): void {
    if (busy) {
      return;
    }

    const parsed = RenamePlaylistInputSchema.safeParse({ name: name.trim() });

    if (!parsed.success) {
      setInvalid(t('renameDialog.invalid'));
      return;
    }

    setInvalid(null);
    Keyboard.dismiss();
    onSubmit(parsed.data.name);
  }

  function requestClose(): void {
    if (busy) {
      return;
    }

    onClose();
  }

  const disabled = busy || !canSubmit;

  return (
    <Sheet
      visible={visible}
      title={t('renameDialog.title')}
      onRequestClose={requestClose}
      closeLabel={t('common.close')}
      testID="rename-sheet"
      backdropTestID="rename-backdrop"
      footer={
        <View style={styles.actions}>
          <Pressable
            testID="rename-cancel"
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            style={({ pressed }) => [
              styles.secondary,
              pressed && styles.secondaryPressed,
              busy && styles.disabled
            ]}
            onPress={requestClose}>
            <Text style={styles.secondaryLabel}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            testID="rename-submit"
            accessibilityRole="button"
            accessibilityState={{ disabled, busy }}
            disabled={disabled}
            style={({ pressed }) => [
              styles.primary,
              pressed && styles.primaryPressed,
              disabled && styles.disabled
            ]}
            onPress={submit}>
            {busy ? <Spinner color={tokenColor('bg')} /> : null}
            <Text style={styles.primaryLabel}>
              {busy ? t('renameDialog.saving') : t('renameDialog.save')}
            </Text>
          </Pressable>
        </View>
      }>
      <Text
        style={[
          styles.description,
          { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
        ]}>
        {t('renameDialog.description')}
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>{t('renameDialog.nameLabel')}</Text>
        <TextInput
          testID="rename-name"
          accessibilityLabel={t('renameDialog.nameLabel')}
          accessibilityState={{ disabled: busy }}
          value={name}
          editable={!busy}
          selectTextOnFocus
          selectionColor={tokenColor('accent')}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          style={[
            styles.input,
            message === null ? null : styles.inputInvalid,
            busy && styles.disabled
          ]}
          onChangeText={text => {
            setName(text);
            setInvalid(null);
          }}
          onSubmitEditing={submit}
        />
        {message === null ? null : (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion={liveRegion}
            style={[
              styles.message,
              { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
            ]}>
            {message}
          </Text>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  description: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    marginTop: tokenLength('space-3')
  },
  field: {
    marginTop: tokenLength('space-4')
  },
  label: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    marginBottom: tokenLength('space-2')
  },
  input: {
    minHeight: touchTarget,
    paddingHorizontal: tokenLength('space-3'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('surface-raised'),
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md')
  },
  inputInvalid: {
    borderColor: tokenColor('tone-failed')
  },
  message: {
    marginTop: tokenLength('space-1'),
    color: tokenColor('tone-failed'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-medium')
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
