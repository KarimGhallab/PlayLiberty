import { IconPhoto } from '@tabler/icons-react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
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

import type { Playlist } from '@playliberty/contracts';
import { problemDetail, useI18n } from '@playliberty/i18n';
import {
  clampPan,
  cropOf,
  formatZoom,
  maxZoom,
  shortEdge
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

import {
  ApiError,
  useRemovePlaylistCover,
  useSetPlaylistCover
} from '@playliberty/api-client';
import type { ApiConfig } from '../../../auth/useApiConfig';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;
const ZOOM_STEP = 0.1;

interface ChosenImage {
  readonly uri: string;
  readonly contentType: string;
}

interface Size {
  readonly width: number;
  readonly height: number;
}

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
  const [chosen, setChosen] = useState<ChosenImage | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  const [stageSize, setStageSize] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [wasOpen, setWasOpen] = useState(playlist !== null);
  const liveProblem = useAnnouncement(problem);
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
  const ready = chosen !== null && natural !== null && stageSize > 0 && !busy;
  const zoomMax = natural === null ? 1 : maxZoom(natural.width, natural.height);
  const zoomDisabled = zoomMax <= 1 || busy || stageSize === 0;
  const adjusted = zoom !== 1 || pan.x !== 0 || pan.y !== 0;
  const live = useRef({
    busy,
    ready,
    natural,
    stageSize,
    zoom,
    zoomMax
  });
  live.current = { busy, ready, natural, stageSize, zoom, zoomMax };

  /* A fresh open must not inherit the last image, refusal or framing. */
  if ((playlist !== null) !== wasOpen) {
    setWasOpen(playlist !== null);

    if (playlist !== null) {
      setChosen(null);
      setNatural(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
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

  const chosenUri = chosen?.uri ?? null;

  /* A new image starts centred at 1x once its source size is known; the size
   * drives the cap and the stage's painted box. */
  useEffect(() => {
    setNatural(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
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
          setNatural({ width, height });
        }
      },
      () => {
        if (active) {
          setNatural(null);
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
    const current = live.current;

    if (current.natural === null || current.stageSize === 0) {
      return;
    }

    const stepped = Math.min(current.zoomMax, Math.max(1, next));
    const clamped = clampPan({
      naturalWidth: current.natural.width,
      naturalHeight: current.natural.height,
      zoom: stepped,
      panX: pan.x,
      panY: pan.y
    });

    setZoom(stepped);
    setPan({ x: clamped.panX, y: clamped.panY });
  }

  function panBy(stepX: number, stepY: number): void {
    const current = live.current;
    const source = current.natural;

    if (source === null) {
      return;
    }

    setPan(previous => {
      const clamped = clampPan({
        naturalWidth: source.width,
        naturalHeight: source.height,
        zoom: current.zoom,
        panX: previous.x + stepX,
        panY: previous.y + stepY
      });

      return { x: clamped.panX, y: clamped.panY };
    });
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

        if (!current.ready || current.natural === null) {
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

          const nextZoom = Math.min(
            current.zoomMax,
            Math.max(1, (start.zoom * distanceOf(touches)) / start.distance)
          );

          setZoom(nextZoom);
          setPan(previous => {
            const clamped = clampPan({
              naturalWidth: current.natural?.width ?? 1,
              naturalHeight: current.natural?.height ?? 1,
              zoom: nextZoom,
              panX: previous.x,
              panY: previous.y
            });

            return { x: clamped.panX, y: clamped.panY };
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

  function cropFor(): ReturnType<typeof cropOf> | null {
    if (natural === null || !adjusted) {
      return null;
    }

    return cropOf({
      naturalWidth: natural.width,
      naturalHeight: natural.height,
      zoom,
      panX: pan.x,
      panY: pan.y
    });
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
        contentType: chosen.contentType,
        crop: cropFor()
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

  function onZoomPress(event: GestureResponderEvent): void {
    if (zoomRail.current === 0 || zoomMax <= 1) {
      return;
    }

    const ratio = Math.min(
      1,
      Math.max(0, event.nativeEvent.locationX / zoomRail.current)
    );

    applyZoom(1 + (zoomMax - 1) * ratio);
  }

  function onZoomAction(event: AccessibilityActionEvent): void {
    if (event.nativeEvent.actionName === 'increment') {
      applyZoom(zoom + ZOOM_STEP);
      return;
    }

    if (event.nativeEvent.actionName === 'decrement') {
      applyZoom(zoom - ZOOM_STEP);
    }
  }

  const edge = natural === null ? 1 : shortEdge(natural.width, natural.height);
  const shownWidth =
    natural === null || stageSize === 0
      ? 0
      : (natural.width / edge) * stageSize;
  const shownHeight =
    natural === null || stageSize === 0
      ? 0
      : (natural.height / edge) * stageSize;
  const zoomRatio = zoomMax <= 1 ? 0 : ((zoom - 1) / (zoomMax - 1)) * 100;

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
            source={{ uri: chosen.uri }}
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
                  { translateX: pan.x * stageSize },
                  { translateY: pan.y * stageSize },
                  { scale: zoom }
                ]
              }
            ]}>
            <AppImage
              testID="cover-preview"
              source={{ uri: chosen.uri }}
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

      {problem === null ? null : (
        <Text
          testID="cover-problem"
          accessibilityRole="alert"
          accessibilityLiveRegion={liveProblem}
          style={[
            styles.problem,
            { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
          ]}>
          {problem}
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
                    now: zoom,
                    text: formatZoom(zoom)
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
                  {formatZoom(zoom)}
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
                onPress={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}>
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
