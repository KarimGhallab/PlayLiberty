import { IconPhoto } from '@tabler/icons-react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Playlist } from '@playliberty/contracts';
import { problemDetail, useI18n } from '@playliberty/i18n';

import Sheet from '../../../shared/components/Sheet/Sheet';
import Spinner from '../../../shared/components/Spinner/Spinner';
import { usePlaylistCover } from '../../../shared/playlistCover/usePlaylistCover';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../../shared/styles/tokens';

import { ApiError } from '../../../api/apiClient/ApiClient';
import { useRemovePlaylistCover } from '../../../api/useRemovePlaylistCover';
import { useSetPlaylistCover } from '../../../api/useSetPlaylistCover';
import type { ApiConfig } from '../../../auth/useApiConfig';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

interface ChosenImage {
  readonly uri: string;
  readonly contentType: string;
}

export interface CoverSheetProps {
  readonly playlist: Playlist | null;
  readonly config: ApiConfig | null;
  readonly onClose: () => void;
}

/*
 * One square is the whole cover surface: the current image, or the chosen one
 * until it is saved. The server owns the bytes and the final square, so the
 * sheet sends the file and nothing else.
 */
export default function CoverSheet({
  playlist,
  config,
  onClose
}: CoverSheetProps) {
  const { t } = useI18n();
  const cover = usePlaylistCover(playlist, config);
  const setCover = useSetPlaylistCover();
  const removeCover = useRemovePlaylistCover();
  const [chosen, setChosen] = useState<ChosenImage | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [wasOpen, setWasOpen] = useState(playlist !== null);
  const busy = setCover.isPending || removeCover.isPending;
  const canRemove = playlist?.coverUpdatedAt != null;

  /* A fresh open must not inherit the last image or refusal. */
  if ((playlist !== null) !== wasOpen) {
    setWasOpen(playlist !== null);

    if (playlist !== null) {
      setChosen(null);
      setProblem(null);
      setConfirmingDiscard(false);
      setConfirmingRemove(false);
    }
  }

  const playlistId = playlist?.id ?? null;

  useEffect(() => {
    if (playlistId === null) {
      return;
    }

    void ImagePicker.requestMediaLibraryPermissionsAsync();
  }, [playlistId]);

  const problemMessage = (error: Error, fallback: string): string =>
    problemDetail(t, error instanceof ApiError ? error.problem : null) ??
    fallback;

  async function choose(): Promise<void> {
    if (busy) {
      return;
    }

    let result: ImagePicker.ImagePickerResult;

    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images']
      });
    } catch {
      setProblem(t('coverDialog.pickFailed'));
      return;
    }

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (asset === undefined) {
      return;
    }

    /* The picker's rendition is a JPEG, so an absent type is that JPEG. */
    const contentType = asset.mimeType ?? 'image/jpeg';

    if (!ACCEPTED_TYPES.has(contentType)) {
      setProblem(t('coverDialog.wrongType'));
      return;
    }

    const size = asset.fileSize ?? new File(asset.uri).size;

    if (size > MAX_BYTES) {
      setProblem(t('coverDialog.tooLarge'));
      return;
    }

    setProblem(null);
    setChosen({ uri: asset.uri, contentType });
  }

  function submit(): void {
    if (busy || playlist === null || chosen === null) {
      return;
    }

    setProblem(null);
    setCover.mutate(
      {
        playlistId: playlist.id,
        file: new File(chosen.uri),
        contentType: chosen.contentType
      },
      {
        onSuccess: () => {
          setChosen(null);
          onClose();
        },
        onError: error => {
          setProblem(problemMessage(error, t('coverDialog.uploadFailed')));
        }
      }
    );
  }

  function remove(): void {
    if (busy || playlist === null) {
      return;
    }

    setProblem(null);
    removeCover.mutate(playlist.id, {
      onSuccess: () => {
        setConfirmingRemove(false);
      },
      onError: error => {
        setProblem(problemMessage(error, t('coverDialog.removeFailed')));
      }
    });
  }

  function requestClose(): void {
    if (busy) {
      return;
    }

    if (confirmingRemove) {
      setConfirmingRemove(false);
      return;
    }

    if (confirmingDiscard) {
      setConfirmingDiscard(false);
      return;
    }

    if (chosen !== null) {
      setConfirmingDiscard(true);
      return;
    }

    onClose();
  }

  return (
    <Sheet
      visible={playlist !== null}
      title={t('coverDialog.title')}
      onRequestClose={requestClose}
      testID="cover-sheet"
      backdropTestID="cover-backdrop">
      <Text style={styles.description}>{t('coverDialog.description')}</Text>

      <View
        testID="cover-stage"
        style={[styles.stage, { backgroundColor: cover.sleeve }]}>
        {chosen === null && cover.source === null ? (
          <IconPhoto
            testID="cover-empty"
            size={tokenLength('space-9')}
            color={tokenColor('muted')}
          />
        ) : null}
        {chosen === null ? (
          cover.source === null ? null : (
            <Image
              testID="cover-current"
              source={cover.source}
              resizeMode="cover"
              style={styles.image}
              onError={cover.onError}
            />
          )
        ) : (
          <Image
            testID="cover-preview"
            source={{ uri: chosen.uri }}
            resizeMode="cover"
            style={styles.image}
          />
        )}
      </View>

      {problem === null ? null : (
        <Text
          testID="cover-problem"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.problem}>
          {problem}
        </Text>
      )}

      {confirmingDiscard ? (
        <>
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.prompt}>
            {t('coverDialog.discardPrompt')}
          </Text>
          <View style={styles.actions}>
            <Pressable
              testID="cover-keep-editing"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondary,
                pressed && styles.secondaryPressed
              ]}
              onPress={() => setConfirmingDiscard(false)}>
              <Text style={styles.secondaryLabel}>
                {t('common.keepEditing')}
              </Text>
            </Pressable>
            <Pressable
              testID="cover-discard"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primary,
                pressed && styles.primaryPressed
              ]}
              onPress={onClose}>
              <Text style={styles.primaryLabel}>{t('common.discard')}</Text>
            </Pressable>
          </View>
        </>
      ) : confirmingRemove ? (
        <>
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.prompt}>
            {t('coverDialog.removePrompt')}
          </Text>
          <View style={styles.actions}>
            <Pressable
              testID="cover-remove-keep"
              accessibilityRole="button"
              disabled={busy}
              style={({ pressed }) => [
                styles.secondary,
                pressed && styles.secondaryPressed,
                busy && styles.disabled
              ]}
              onPress={() => setConfirmingRemove(false)}>
              <Text style={styles.secondaryLabel}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              testID="cover-remove-confirm"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              style={({ pressed }) => [
                styles.destructive,
                pressed && styles.destructivePressed,
                busy && styles.disabled
              ]}
              onPress={remove}>
              {removeCover.isPending ? (
                <Spinner color={tokenColor('bg')} />
              ) : null}
              <Text style={styles.primaryLabel}>
                {removeCover.isPending
                  ? t('coverDialog.removing')
                  : t('coverDialog.remove')}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Pressable
            testID="cover-choose"
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            style={({ pressed }) => [
              styles.choose,
              pressed && styles.secondaryPressed,
              busy && styles.disabled
            ]}
            onPress={() => {
              void choose();
            }}>
            <Text style={styles.secondaryLabel}>{t('coverDialog.choose')}</Text>
          </Pressable>

          {canRemove ? (
            <Pressable
              testID="cover-remove"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              style={({ pressed }) => [
                styles.remove,
                pressed && styles.secondaryPressed,
                busy && styles.disabled
              ]}
              onPress={() => {
                setConfirmingDiscard(false);
                setConfirmingRemove(true);
              }}>
              <Text style={styles.removeLabel}>{t('coverDialog.remove')}</Text>
            </Pressable>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              testID="cover-cancel"
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
              testID="cover-save"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || chosen === null, busy }}
              disabled={busy || chosen === null}
              style={({ pressed }) => [
                styles.primary,
                pressed && styles.primaryPressed,
                (busy || chosen === null) && styles.disabled
              ]}
              onPress={submit}>
              {setCover.isPending ? <Spinner color={tokenColor('bg')} /> : null}
              <Text style={styles.primaryLabel}>
                {setCover.isPending
                  ? t('coverDialog.saving')
                  : t('coverDialog.save')}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  description: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    marginTop: tokenLength('space-1')
  },
  stage: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokenLength('space-4'),
    borderRadius: tokenLength('radius-card'),
    overflow: 'hidden'
  },
  image: {
    width: '100%',
    height: '100%'
  },
  problem: {
    marginTop: tokenLength('space-3'),
    color: tokenColor('tone-failed'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '500',
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  },
  prompt: {
    marginTop: tokenLength('space-4'),
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '500',
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  },
  choose: {
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokenLength('space-4'),
    paddingHorizontal: tokenLength('space-5'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control')
  },
  remove: {
    minHeight: touchTarget,
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: tokenLength('space-1'),
    paddingHorizontal: tokenLength('space-3')
  },
  removeLabel: {
    color: tokenColor('tone-failed'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokenLength('space-2'),
    marginTop: tokenLength('space-4')
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
  destructive: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokenLength('space-2'),
    paddingHorizontal: tokenLength('space-5'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('tone-failed')
  },
  destructivePressed: {
    opacity: tokenNumber('opacity-disabled')
  },
  disabled: {
    opacity: tokenNumber('opacity-disabled')
  }
});
