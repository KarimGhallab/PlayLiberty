import { useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import type { AddTrackResult, Playlist } from '@playliberty/contracts';
import { AddTrackInputSchema, AddTrackOutcome } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import { useAnnouncement } from '../../../shared/a11y/useAnnouncement';
import Checkbox from '../../../shared/components/Checkbox/Checkbox';
import Sheet from '../../../shared/components/Sheet/Sheet';
import SheetActions from '../../../shared/components/SheetActions/SheetActions';
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

export interface AddTrackSheetProps {
  readonly visible: boolean;
  /** The playlist the sheet was opened from, listed first and preselected. */
  readonly currentPlaylist: Playlist;
  /** The writable playlists from the gallery's first page. */
  readonly playlists: readonly Playlist[];
  /** That page's size, named by the cap note. Null while the read is pending. */
  readonly firstPageLimit: number | null;
  readonly truncated: boolean;
  readonly busy: boolean;
  /** The whole request's refusal, which shares the field's message slot. */
  readonly problem: string | null;
  /** The batch's answer, one outcome per chosen playlist. */
  readonly result: AddTrackResult | null;
  readonly onSubmit: (url: string, playlistIds: string[]) => void;
  readonly onClose: () => void;
}

const PLACEHOLDER = 'https://youtube.com/watch?v=...';

const OUTCOME_LABEL = {
  [AddTrackOutcome.Added]: 'addTrackDialog.outcomeAdded',
  [AddTrackOutcome.AlreadyPresent]: 'addTrackDialog.outcomePresent',
  [AddTrackOutcome.Refused]: 'addTrackDialog.outcomeRefused'
} as const;

/* The link travels once for the whole batch. The picker scrolls inside the
 * sheet so the actions stay put, and the first page is named when it cuts a
 * longer library. */
export default function AddTrackSheet({
  visible,
  currentPlaylist,
  playlists,
  firstPageLimit,
  truncated,
  busy,
  problem,
  result,
  onSubmit,
  onClose
}: AddTrackSheetProps) {
  const scale = useTextScale();
  const descriptionStyle = [
    styles.description,
    { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
  ];
  const outcomeNameStyle = [
    styles.outcomeName,
    { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
  ];
  const messageStyle = [
    styles.message,
    { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
  ];
  const noteStyle = [
    styles.note,
    { lineHeight: lineHeightFor('text-xs', 'leading-normal', scale) }
  ];
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string[]>([currentPlaylist.id]);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);

  /* A fresh open must not inherit the last one's paste or choice. */
  if (visible !== wasVisible) {
    setWasVisible(visible);

    if (visible) {
      setUrl('');
      setInvalid(null);
      setChosen([currentPlaylist.id]);
      setConfirmingDiscard(false);
    }
  }

  const message = invalid ?? problem;
  const liveRegion = useAnnouncement(message);
  const dirty = url.trim().length > 0;
  const ordered = [
    currentPlaylist,
    ...playlists.filter(playlist => playlist.id !== currentPlaylist.id)
  ];
  const nameOf = (playlistId: string): string =>
    ordered.find(playlist => playlist.id === playlistId)?.name ?? playlistId;

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

  const toggle = (playlistId: string): void => {
    setChosen(current =>
      current.includes(playlistId)
        ? current.filter(id => id !== playlistId)
        : [...current, playlistId]
    );
  };

  function submit(): void {
    if (busy || chosen.length === 0) {
      return;
    }

    const trimmed = url.trim();
    const parsed = AddTrackInputSchema.safeParse({
      url: trimmed,
      playlistIds: chosen
    });

    /* A `list` parameter makes it a playlist link, which this sheet does not
     * take; the whole request would be refused, so the field says so first. */
    const isPlaylistUrl =
      parsed.success && new URL(parsed.data.url).searchParams.has('list');

    if (!parsed.success || isPlaylistUrl) {
      setInvalid(t('addTrackDialog.invalid'));
      return;
    }

    setInvalid(null);
    Keyboard.dismiss();
    onSubmit(parsed.data.url, parsed.data.playlistIds);
  }

  return (
    <Sheet
      visible={visible}
      title={t('addTrackDialog.title')}
      onRequestClose={requestClose}
      closeLabel={t('common.close')}
      testID="add-track-sheet"
      backdropTestID="add-track-backdrop"
      footer={
        <SheetActions
          testIDPrefix="add-track"
          busy={busy}
          canSubmit={dirty && chosen.length > 0}
          addLabel={t('addTrackDialog.add')}
          addingLabel={t('addTrackDialog.adding')}
          confirmingDiscard={confirmingDiscard}
          onAdd={submit}
          onCancel={requestClose}
          onDiscard={onClose}
          onKeepEditing={() => setConfirmingDiscard(false)}
        />
      }>
      <Text style={descriptionStyle}>{t('addTrackDialog.description')}</Text>

      {result === null ? null : (
        <ScrollView
          testID="add-track-outcomes"
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={styles.outcomes}
          contentContainerStyle={styles.outcomeContent}>
          {result.results.map(entry => (
            <View
              key={entry.playlistId}
              testID={`add-track-outcome-${entry.playlistId}`}
              style={styles.outcome}>
              <Text numberOfLines={1} style={outcomeNameStyle}>
                {nameOf(entry.playlistId)}
              </Text>
              <Text
                style={[
                  styles.outcomeWord,
                  { color: outcomeColor(entry.outcome) }
                ]}>
                {t(OUTCOME_LABEL[entry.outcome])}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>{t('addTrackDialog.videoLabel')}</Text>
        <TextInput
          testID="add-track-url"
          accessibilityLabel={t('addTrackDialog.videoLabel')}
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
            style={messageStyle}>
            {message}
          </Text>
        )}
      </View>

      <View style={styles.pickHeader}>
        <Text style={styles.pickLabel}>
          {t('addTrackDialog.playlistsLabel')}
        </Text>
        {truncated && firstPageLimit !== null ? (
          <Text testID="add-track-first-page" style={noteStyle}>
            {t('addTrackDialog.firstPage', { count: firstPageLimit })}
          </Text>
        ) : null}
      </View>

      <ScrollView
        testID="add-track-pick"
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        style={styles.pick}
        contentContainerStyle={styles.pickContent}>
        {ordered.map(item => (
          <Checkbox
            key={item.id}
            testID={`add-track-pick-${item.id}`}
            label={item.name}
            checked={chosen.includes(item.id)}
            disabled={busy}
            onChange={() => toggle(item.id)}
          />
        ))}
      </ScrollView>
    </Sheet>
  );
}

function outcomeColor(outcome: AddTrackOutcome): string {
  if (outcome === AddTrackOutcome.Added) {
    return tokenColor('accent');
  }

  if (outcome === AddTrackOutcome.Refused) {
    return tokenColor('tone-failed');
  }

  return tokenColor('muted');
}

const styles = StyleSheet.create({
  description: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  outcomes: {
    maxHeight: touchTarget * 3,
    marginTop: tokenLength('space-4'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('bg')
  },
  outcomeContent: {
    padding: tokenLength('space-1')
  },
  outcome: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3'),
    paddingHorizontal: tokenLength('space-3')
  },
  outcomeName: {
    flexShrink: 1,
    flexGrow: 1,
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  outcomeWord: {
    flexShrink: 0,
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-semibold')
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
  pickHeader: {
    gap: tokenLength('space-1'),
    marginTop: tokenLength('space-4')
  },
  pickLabel: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-semibold')
  },
  note: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  pick: {
    maxHeight: touchTarget * 7,
    flexShrink: 1,
    marginTop: tokenLength('space-2')
  },
  pickContent: {
    gap: tokenLength('space-1')
  },
  disabled: {
    opacity: tokenNumber('opacity-disabled')
  }
});
