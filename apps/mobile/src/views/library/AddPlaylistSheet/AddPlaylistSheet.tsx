import { useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { CreatePlaylistInputSchema } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import Checkbox from '../../../shared/components/Checkbox/Checkbox';
import Sheet from '../../../shared/components/Sheet/Sheet';
import Spinner from '../../../shared/components/Spinner/Spinner';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../../shared/styles/tokens';

export interface AddPlaylistSheetProps {
  readonly visible: boolean;
  readonly busy: boolean;
  readonly problem: string | null;
  readonly onSubmit: (url: string, skipNonMusic: boolean) => void;
  readonly onClose: () => void;
}

const PLACEHOLDER = 'https://youtube.com/playlist?list=...';

/* The schema is the client's half of the check and the server's is the other: a
 * link the server refuses comes back as a problem in the same slot, so the one
 * field shows one thing wrong with it. */
export default function AddPlaylistSheet({
  visible,
  busy,
  problem,
  onSubmit,
  onClose
}: AddPlaylistSheetProps) {
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [skipNonMusic, setSkipNonMusic] = useState(true);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);

  /* A fresh open must not inherit the last one's paste or choice. */
  if (visible !== wasVisible) {
    setWasVisible(visible);

    if (visible) {
      setUrl('');
      setSkipNonMusic(true);
      setInvalid(null);
      setConfirmingDiscard(false);
    }
  }

  const message = invalid ?? problem;
  const dirty = url.trim().length > 0;

  function requestClose(): void {
    if (busy) {
      return;
    }

    if (confirmingDiscard) {
      setConfirmingDiscard(false);
      return;
    }

    if (!dirty) {
      onClose();
      return;
    }

    setConfirmingDiscard(true);
  }

  function submit(): void {
    if (busy) {
      return;
    }

    const trimmed = url.trim();
    const parsed = CreatePlaylistInputSchema.safeParse({ url: trimmed });

    if (!parsed.success) {
      setInvalid(t('addPlaylistDialog.invalid'));
      return;
    }

    setInvalid(null);
    Keyboard.dismiss();
    onSubmit(trimmed, skipNonMusic);
  }

  return (
    <Sheet
      visible={visible}
      title={t('addPlaylistDialog.title')}
      onRequestClose={requestClose}
      testID="add-sheet"
      backdropTestID="add-backdrop">
      <View style={styles.field}>
        <Text style={styles.label}>{t('addPlaylistDialog.linkLabel')}</Text>
        <TextInput
          testID="add-url"
          accessibilityLabel={t('addPlaylistDialog.linkLabel')}
          accessibilityState={{ disabled: busy }}
          value={url}
          editable={!busy}
          placeholder={PLACEHOLDER}
          placeholderTextColor={tokenColor('muted')}
          selectionColor={tokenColor('accent')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
          style={[
            styles.input,
            message === null ? null : styles.inputInvalid,
            busy && styles.disabled
          ]}
          onChangeText={text => {
            setUrl(text);
            setInvalid(null);
          }}
          onSubmitEditing={submit}
        />
        {message === null ? null : (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.message}>
            {message}
          </Text>
        )}
      </View>

      <View style={styles.checkBlock}>
        <Checkbox
          testID="add-skip"
          label={t('addPlaylistDialog.skip')}
          hint={t('addPlaylistDialog.skipHint')}
          checked={skipNonMusic}
          disabled={busy}
          onChange={setSkipNonMusic}
        />
      </View>

      {confirmingDiscard ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.discard}>
          {t('common.discardPrompt')}
        </Text>
      ) : null}

      {confirmingDiscard ? (
        <View style={styles.actions}>
          <Pressable
            testID="add-keep-editing"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.secondary,
              pressed && styles.secondaryPressed
            ]}
            onPress={() => setConfirmingDiscard(false)}>
            <Text style={styles.secondaryLabel}>{t('common.keepEditing')}</Text>
          </Pressable>
          <Pressable
            testID="add-discard"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primary,
              pressed && styles.primaryPressed
            ]}
            onPress={onClose}>
            <Text style={styles.primaryLabel}>{t('common.discard')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable
            testID="add-cancel"
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
            testID="add-submit"
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || !dirty, busy }}
            disabled={busy || !dirty}
            style={({ pressed }) => [
              styles.primary,
              pressed && styles.primaryPressed,
              !dirty && styles.disabled
            ]}
            onPress={submit}>
            {busy ? <Spinner color={tokenColor('bg')} /> : null}
            <Text style={styles.primaryLabel}>
              {busy
                ? t('addPlaylistDialog.adding')
                : t('addPlaylistDialog.add')}
            </Text>
          </Pressable>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: '500',
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  },
  checkBlock: {
    marginTop: tokenLength('space-4')
  },
  discard: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '500',
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal'),
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
    fontWeight: '500'
  },
  disabled: {
    opacity: tokenNumber('opacity-disabled')
  }
});
