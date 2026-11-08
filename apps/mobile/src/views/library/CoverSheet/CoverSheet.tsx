import { IconPhoto } from '@tabler/icons-react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useReducer, useRef, useState } from 'react';
import type {
  AccessibilityActionEvent,
  GestureResponderEvent
} from 'react-native';
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

import {
  ApiError,
  useRemovePlaylistCover,
  useSetPlaylistCover
} from '@playliberty/api-client';
import type { Playlist } from '@playliberty/contracts';
import { problemDetail, useI18n } from '@playliberty/i18n';
import {
  COVER_ZOOM_STEP,
  coverUploadAdjusted,
  coverUploadBox,
  coverUploadInitial,
  coverUploadStageReady,
  coverUploadSubmission,
  coverUploadZoomMax,
  coverUploadZoomRatio,
  formatZoom,
  reduceCoverUpload
} from '@playliberty/ui-foundation';

import { useAnnouncement } from '../../../shared/a11y/useAnnouncement';
import AppImage from '../../../shared/components/AppImage/AppImage';
import Sheet from '../../../shared/components/Sheet/Sheet';
import Spinner from '../../../shared/components/Spinner/Spinner';
import { usePlaylistCover } from '../../../shared/playlistCover/usePlaylistCover';
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

import type { ApiConfig } from '../../../auth/useApiConfig';

interface Point {
  readonly x: number;
  readonly y: number;
}

export interface CoverSheetProps {
  readonly playlist: Playlist | null;
  readonly config: ApiConfig | null;
  readonly onClose: () => void;
}

/*
 * One square is the whole cover surface: the current image, or the chosen one
 * shaped into its crop. The server owns the bytes and the final square, so the
 * sheet sends the file and, when the stage moved, the four fractions.
 */
export default function CoverSheet({
  playlist,
  config,
  onClose
}: CoverSheetProps) {
  const { t } = useI18n();
  const scale = useTextScale();
  const cover = usePlaylistCover(playlist, config);
  const setCover = useSetPlaylistCover();
  const removeCover = useRemovePlaylistCover();
  const [state, dispatch] = useReducer(
    reduceCoverUpload<{ uri: string }>,
    coverUploadInitial<{ uri: string }>()
  );
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [stageSize, setStageSize] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const { chosen, natural, verdict, confirmingDiscard, confirmingRemove } =
    state;
  const chosenUri = chosen?.file.uri ?? null;
  const message =
    verdict === null
      ? problem
      : t(
          verdict === 'wrong-type'
            ? 'coverDialog.wrongType'
            : 'coverDialog.tooLarge'
        );
  const liveProblem = useAnnouncement(message);
  const liveDiscard = useAnnouncement(
    confirmingDiscard ? t('coverDialog.discardPrompt') : null
  );
  const liveRemove = useAnnouncement(
    confirmingRemove ? t('coverDialog.removePrompt') : null
  );
  const drag = useRef<Point | null>(null);
  const zoomRail = useRef(0);
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const busy = setCover.isPending || removeCover.isPending;
  const canRemove = playlist?.coverUpdatedAt != null;
  const ready = coverUploadStageReady(state) && stageSize > 0 && !busy;
  const zoomMax = coverUploadZoomMax(state);
  const zoomDisabled = zoomMax <= 1 || busy || stageSize === 0;
  const adjusted = coverUploadAdjusted(state);
  const zoomRatio = coverUploadZoomRatio(state);
  const box = coverUploadBox(state);
  const shownWidth =
    box === null || stageSize === 0 ? 0 : box.width * stageSize;
  const shownHeight =
    box === null || stageSize === 0 ? 0 : box.height * stageSize;
  const live = useRef({
    ready,
    stageSize,
    zoom: state.zoom
  });
  live.current = { ready, stageSize, zoom: state.zoom };

  useEffect(() => {
    dispatch({ type: 'busy', busy });
  }, [busy]);

  const playlistId = playlist?.id ?? null;

  /* A fresh open must not inherit the last image, refusal or framing. */
  useEffect(() => {
    if (playlistId === null) {
      return;
    }

    dispatch({ type: 'reset' });
    setProblem(null);
    drag.current = null;
    pinch.current = null;
  }, [playlistId]);

  useEffect(() => {
    if (!state.closeRequested) {
      return;
    }

    closeRef.current();
    dispatch({ type: 'closed' });
  }, [state.closeRequested]);

  useEffect(() => {
    if (playlistId === null) {
      return;
    }

    void ImagePicker.requestMediaLibraryPermissionsAsync();
  }, [playlistId]);

  /* A new image starts centred at 1x once its source size is known; the size
   * drives the cap and the stage's painted box. */
  useEffect(() => {
    drag.current = null;
    pinch.current = null;

    if (chosenUri === null) {
      return;
    }

    let active = true;

    Image.getSize(
      chosenUri,
      (width, height) => {
        if (active) {
          dispatch({ type: 'measured', size: { width, height } });
        }
      },
      () => {
        if (active) {
          dispatch({ type: 'measureFailed' });
        }
      }
    );

    return () => {
      active = false;
    };
  }, [chosenUri]);

  const problemMessage = (error: Error, fallback: string): string =>
    problemDetail(t, error instanceof ApiError ? error.problem : null) ??
    fallback;

  function applyZoom(next: number): void {
    dispatch({ type: 'zoomTo', zoom: next });
  }

  function panBy(stepX: number, stepY: number): void {
    dispatch({ type: 'panBy', x: stepX, y: stepY });
  }

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => live.current.ready,
      onMoveShouldSetPanResponder: () => live.current.ready,
      onPanResponderGrant: event => {
        const touches = event.nativeEvent.touches;

        if (touches.length >= 2) {
          pinch.current = {
            distance: distanceOf(touches),
            zoom: live.current.zoom
          };
          drag.current = null;
          return;
        }

        const touch = touches[0];

        if (touch !== undefined) {
          drag.current = { x: touch.pageX, y: touch.pageY };
        }
      },
      onPanResponderMove: event => {
        const current = live.current;
        const touches = event.nativeEvent.touches;

        if (!current.ready) {
          return;
        }

        if (touches.length >= 2) {
          const start = pinch.current;

          if (start === null) {
            pinch.current = {
              distance: distanceOf(touches),
              zoom: current.zoom
            };
            drag.current = null;
            return;
          }

          dispatch({
            type: 'zoomTo',
            zoom: (start.zoom * distanceOf(touches)) / start.distance
          });
          return;
        }

        pinch.current = null;

        const touch = touches[0];

        if (touch === undefined) {
          return;
        }

        const previous = drag.current;

        if (previous === null) {
          drag.current = { x: touch.pageX, y: touch.pageY };
          return;
        }

        drag.current = { x: touch.pageX, y: touch.pageY };
        panBy(
          (touch.pageX - previous.x) / current.stageSize,
          (touch.pageY - previous.y) / current.stageSize
        );
      },
      onPanResponderRelease: () => {
        drag.current = null;
        pinch.current = null;
      },
      onPanResponderTerminate: () => {
        drag.current = null;
        pinch.current = null;
      }
    })
  ).current;

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
    const size = asset.fileSize ?? new File(asset.uri).size;

    setProblem(null);
    dispatch({
      type: 'choose',
      file: { file: { uri: asset.uri }, contentType, size }
    });
  }

  function submit(): void {
    if (busy) {
      return;
    }

    const submission = coverUploadSubmission(state);

    if (playlist === null || submission === null) {
      return;
    }

    setProblem(null);
    setCover.mutate(
      {
        playlistId: playlist.id,
        file: new File(submission.file.file.uri),
        contentType: submission.file.contentType,
        crop: submission.crop
      },
      {
        onSuccess: () => {
          dispatch({ type: 'submitted' });
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
        dispatch({ type: 'removed' });
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

    dispatch({ type: 'requestClose' });
  }

  function onZoomPress(event: GestureResponderEvent): void {
    if (zoomRail.current === 0 || zoomMax <= 1) {
      return;
    }

    const ratio = Math.min(
      1,
      Math.max(0, event.nativeEvent.locationX / zoomRail.current)
    );

    dispatch({ type: 'zoomToRatio', ratio });
  }

  function onZoomAction(event: AccessibilityActionEvent): void {
    if (event.nativeEvent.actionName === 'increment') {
      applyZoom(state.zoom + COVER_ZOOM_STEP);
      return;
    }

    if (event.nativeEvent.actionName === 'decrement') {
      applyZoom(state.zoom - COVER_ZOOM_STEP);
    }
  }

  return (
    <Sheet
      visible={playlist !== null}
      title={t('coverDialog.title')}
      onRequestClose={requestClose}
      closeLabel={t('common.close')}
      testID="cover-sheet"
      backdropTestID="cover-backdrop">
      <Text style={styles.description}>{t('coverDialog.description')}</Text>

      <View
        testID="cover-stage"
        style={[styles.stage, { backgroundColor: cover.sleeve }]}
        onLayout={event => setStageSize(event.nativeEvent.layout.width)}
        {...responder.panHandlers}>
        {chosen === null && cover.source === null ? (
          <IconPhoto
            testID="cover-empty"
            size={tokenLength('space-9')}
            color={tokenColor('muted')}
          />
        ) : null}
        {chosen === null ? (
          cover.source === null ? null : (
            <AppImage
              testID="cover-current"
              source={cover.source}
              resizeMode="cover"
              style={styles.image}
              onError={cover.onError}
            />
          )
        ) : natural === null || stageSize === 0 ? (
          <AppImage
            testID="cover-preview"
            source={{ uri: chosen.file.uri }}
            resizeMode="cover"
            natural
            style={styles.image}
          />
        ) : (
          <View
            style={[
              styles.stageFill,
              {
                transform: [
                  { translateX: state.panX * stageSize },
                  { translateY: state.panY * stageSize },
                  { scale: state.zoom }
                ]
              }
            ]}>
            <AppImage
              testID="cover-preview"
              source={{ uri: chosen.file.uri }}
              natural
              style={{
                position: 'absolute',
                left: (stageSize - shownWidth) / 2,
                top: (stageSize - shownHeight) / 2,
                width: shownWidth,
                height: shownHeight
              }}
            />
          </View>
        )}
      </View>

      {message === null ? null : (
        <Text
          testID="cover-problem"
          accessibilityRole="alert"
          accessibilityLiveRegion={liveProblem}
          style={[
            styles.problem,
            { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
          ]}>
          {message}
        </Text>
      )}

      {confirmingDiscard ? (
        <>
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion={liveDiscard}
            style={[
              styles.prompt,
              { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
            ]}>
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
              onPress={() => dispatch({ type: 'cancelDiscard' })}>
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
            accessibilityLiveRegion={liveRemove}
            style={[
              styles.prompt,
              { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
            ]}>
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
              onPress={() => dispatch({ type: 'cancelRemove' })}>
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
          {chosen === null || natural === null ? null : (
            <View style={styles.crop}>
              <View style={styles.zoomRow}>
                <Text style={styles.zoomLabel}>{t('coverDialog.zoom')}</Text>
                <Pressable
                  testID="cover-zoom"
                  accessibilityRole="adjustable"
                  accessibilityLabel={t('coverDialog.zoom')}
                  accessibilityValue={{
                    min: 1,
                    max: zoomMax,
                    now: state.zoom,
                    text: formatZoom(state.zoom)
                  }}
                  accessibilityState={{ disabled: zoomDisabled }}
                  accessibilityActions={[
                    { name: 'increment' },
                    { name: 'decrement' }
                  ]}
                  disabled={zoomDisabled}
                  onAccessibilityAction={onZoomAction}
                  onLayout={event => {
                    zoomRail.current = event.nativeEvent.layout.width;
                  }}
                  onPress={onZoomPress}
                  style={styles.zoomTrack}>
                  <View style={[styles.zoomFill, { width: `${zoomRatio}%` }]} />
                  <View style={[styles.zoomKnob, { left: `${zoomRatio}%` }]} />
                </Pressable>
                <Text testID="cover-zoom-value" style={styles.zoomValue}>
                  {formatZoom(state.zoom)}
                </Text>
              </View>
              <Pressable
                testID="cover-reset"
                accessibilityRole="button"
                accessibilityState={{ disabled: !adjusted || busy }}
                disabled={!adjusted || busy}
                style={({ pressed }) => [
                  styles.reset,
                  pressed && styles.secondaryPressed,
                  (!adjusted || busy) && styles.disabled
                ]}
                onPress={() => dispatch({ type: 'resetCrop' })}>
                <Text style={styles.resetLabel}>{t('coverDialog.reset')}</Text>
              </Pressable>
            </View>
          )}

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
              onPress={() => dispatch({ type: 'requestRemove' })}>
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

function distanceOf(
  touches: readonly { pageX: number; pageY: number }[]
): number {
  const first = touches[0];
  const second = touches[1];

  if (first === undefined || second === undefined) {
    return 0;
  }

  return Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
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
  stageFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  image: {
    width: '100%',
    height: '100%'
  },
  crop: {
    marginTop: tokenLength('space-3'),
    gap: tokenLength('space-2')
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3')
  },
  zoomLabel: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  zoomTrack: {
    minHeight: touchTarget,
    flex: 1,
    justifyContent: 'center'
  },
  zoomFill: {
    height: 2,
    backgroundColor: tokenColor('accent')
  },
  zoomKnob: {
    position: 'absolute',
    width: tokenLength('space-4'),
    height: tokenLength('space-4'),
    marginLeft: -tokenLength('space-2'),
    borderRadius: tokenLength('space-2'),
    backgroundColor: tokenColor('accent')
  },
  zoomValue: {
    minWidth: tokenLength('space-8'),
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-semibold'),
    textAlign: 'right'
  },
  reset: {
    minHeight: touchTarget,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-3')
  },
  resetLabel: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  problem: {
    marginTop: tokenLength('space-3'),
    color: tokenColor('tone-failed'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-medium')
  },
  prompt: {
    marginTop: tokenLength('space-4'),
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-medium')
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
    fontWeight: tokenWeight('weight-medium')
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
