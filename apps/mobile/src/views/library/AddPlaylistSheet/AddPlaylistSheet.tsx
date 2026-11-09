import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';

import { CreatePlaylistInputSchema } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import { useAnnouncement } from '../../../shared/a11y/useAnnouncement/useAnnouncement';
import Checkbox from '../../../shared/components/Checkbox/Checkbox';
import Sheet from '../../../shared/components/Sheet/Sheet';
import SheetActions from '../../../shared/components/SheetActions';
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
} from '../../../shared/styles/tokens/tokens';

export interface AddPlaylistSheetProps {
  readonly visible: boolean;
  readonly busy: boolean;
  readonly problem: string | null;
  readonly onSubmit: (url: string, skipNonMusic: boolean) => void;
  readonly onClose: () => void;
}

const PLACEHOLDER = 'https://youtube.com/playlist?list=...';

/* The schema is the client's half of the check; a server refusal lands in the
 * same slot, so the field shows one thing wrong with it. */
export default function AddPlaylistSheet({
  visible,
  busy,
  problem,
  onSubmit,
  onClose
}: AddPlaylistSheetProps) {
  const { t } = useI18n();
  const scale = useTextScale();
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
  const liveRegion = useAnnouncement(message);
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
      closeLabel={t('common.close')}
      testID="add-sheet"
      backdropTestID="add-backdrop"
      footer={
        <SheetActions
          testIDPrefix="add"
          busy={busy}
          canSubmit={dirty}
          addLabel={t('addPlaylistDialog.add')}
          addingLabel={t('addPlaylistDialog.adding')}
          confirmingDiscard={confirmingDiscard}
          onAdd={submit}
          onCancel={requestClose}
          onDiscard={onClose}
          onKeepEditing={() => setConfirmingDiscard(false)}
        />
      }>
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
            accessibilityLiveRegion={liveRegion}
            style={[
              styles.message,
              { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
            ]}>
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
    fontWeight: tokenWeight('weight-medium')
  },
  checkBlock: {
    marginTop: tokenLength('space-4')
  },
  disabled: {
    opacity: tokenNumber('opacity-disabled')
  }
});
