import { IconDots } from '@tabler/icons-react-native';
import { memo, useRef, useState } from 'react';
import {
  Animated,
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

import type { PlaylistTrack } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import {
  failureSentence,
  formatDuration,
  trackStateFacts,
  useI18n
} from '@playliberty/i18n';
import { isPlayable } from '@playliberty/player';
import { fileTone, trackTone } from '@playliberty/ui-foundation';

import AppImage from '../../../shared/components/AppImage';
import { usePressScale } from '../../../shared/components/PressableScale/usePressScale';
import TrackBars from '../../../shared/components/TrackBars';
import {
  lineHeightFor,
  useTextScale
} from '../../../shared/styles/textMetrics';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenWeight,
  touchTarget
} from '../../../shared/styles/tokens/tokens';
import { trackToneColor } from '../../../shared/trackToneColor';

import { mediaAddress } from '../../../api/credentialed/credentialed';
import type { ApiConfig } from '../../../auth/useApiConfig/useApiConfig';

/* A press plays, a drag scrolls; travel comes from the touch, since a Pressable
 * counts an inside release as a press. Stays under the 12pt a swipe needs. */
const DRAG_THRESHOLD = tokenLength('space-2');

export interface TrackRowProps {
  readonly association: PlaylistTrack;
  readonly config: ApiConfig | null;
  readonly current: boolean;
  /* Whether the queue is playing, which decides the word and the equalizer. */
  readonly playing: boolean;
  readonly onPlay: (trackId: string) => void;
  /** Absent leaves the row without a lane; the detail supplies it. */
  readonly onOpenActions?: (trackId: string) => void;
}

/* Artwork, title, state word, duration, and for a failed track the shared
 * sentence behind a reveal; the whole row plays when the file is stored. */
function TrackRow({
  association,
  config,
  current,
  playing,
  onPlay,
  onOpenActions
}: TrackRowProps) {
  const { t } = useI18n();
  const scale = useTextScale();
  const { track } = association;
  const [revealed, setRevealed] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const { pressTo, style: pressStyle } = usePressScale(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const playable = isPlayable(track);
  const duration =
    track.durationSeconds === null
      ? '--:--'
      : formatDuration(track.durationSeconds);
  const facts = trackStateFacts(
    t,
    track.fileStatus,
    track.sourceStatus,
    track.provider
  );
  const stateTone = fileTone(track.fileStatus, track.sourceStatus);
  const sourceTone = trackTone(track.fileStatus, track.sourceStatus);
  const stateWord =
    facts.file ??
    (current ? t(playing ? 'trackBars.playing' : 'trackBars.paused') : null);
  const label = [track.title, stateWord, facts.source, duration]
    .filter((part): part is string => part !== null)
    .join(', ');
  const artwork =
    config === null || track.thumbnailPath === null || thumbnailFailed
      ? null
      : mediaAddress(config, endpoints.trackThumbnail, {
          trackId: track.id
        });
  const withFailure =
    track.failureKind !== null || track.failureReason !== null;
  /* The play layer carries the row's name, so the painted copy is not a second
   * stop; the sentence, the disclosure and the lane stay outside it. */
  const copyProps = playable
    ? {
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const
      }
    : {};

  const beginTouch = (event: GestureResponderEvent): void => {
    const touch = event.nativeEvent.touches[0];
    touchStart.current =
      touch === undefined ? null : { x: touch.pageX, y: touch.pageY };
    dragged.current = false;
  };

  const trackTouch = (event: GestureResponderEvent): void => {
    const origin = touchStart.current;
    const touch = event.nativeEvent.touches[0];

    if (origin === null || touch === undefined) {
      return;
    }

    if (
      Math.hypot(touch.pageX - origin.x, touch.pageY - origin.y) >
      DRAG_THRESHOLD
    ) {
      dragged.current = true;
    }
  };

  const play = (): void => {
    if (!dragged.current) {
      onPlay(track.id);
    }
  };

  return (
    <Animated.View
      testID="track-row"
      style={[styles.row, current && styles.rowCurrent, pressStyle]}>
      {playable ? (
        <Pressable
          testID="track-play"
          accessibilityRole="button"
          accessibilityLabel={label}
          style={StyleSheet.absoluteFill}
          onTouchStart={beginTouch}
          onTouchMove={trackTouch}
          onPressIn={() => pressTo(1)}
          onPressOut={() => pressTo(0)}
          onPress={play}
        />
      ) : null}

      <View testID="track-artwork" pointerEvents="none" style={styles.art}>
        {artwork === null ? null : (
          <AppImage
            testID="track-artwork-image"
            accessible={false}
            source={artwork}
            style={styles.image}
            onError={() => setThumbnailFailed(true)}
          />
        )}
        {current ? <View style={styles.scrim} /> : null}
        {current ? <TrackBars playing={playing} /> : null}
      </View>

      <View pointerEvents="box-none" style={styles.body}>
        <View {...copyProps} pointerEvents="none">
          <Text
            testID="track-title"
            numberOfLines={2}
            style={[styles.title, current && styles.titleCurrent]}>
            {track.title}
          </Text>
        </View>
        <View pointerEvents="box-none" style={styles.sub}>
          <View {...copyProps} pointerEvents="none" style={styles.sub}>
            {current ? (
              <View style={styles.nowMark}>
                <View style={styles.nowDot} />
                <Text testID="track-now" style={styles.now}>
                  {t(playing ? 'trackBars.playing' : 'trackBars.paused')}
                </Text>
              </View>
            ) : null}
            {facts.file === null ? null : (
              <Text
                testID="track-state"
                style={[styles.state, { color: trackToneColor(stateTone) }]}>
                {facts.file}
              </Text>
            )}
            {facts.source === null ? null : (
              <>
                {facts.file === null ? null : (
                  <Text
                    testID="track-separator"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    style={styles.separator}>
                    ·
                  </Text>
                )}
                <Text
                  testID="track-source"
                  style={[
                    styles.source,
                    { color: trackToneColor(sourceTone) }
                  ]}>
                  {facts.source}
                </Text>
              </>
            )}
          </View>
          {withFailure ? (
            <Text
              testID="track-failure"
              style={[
                styles.sentence,
                {
                  lineHeight: lineHeightFor('text-xs', 'leading-normal', scale)
                }
              ]}>
              {failureSentence(t, track.failureKind)}
            </Text>
          ) : null}
          {track.failureReason === null ? null : (
            <Pressable
              testID="track-details"
              accessibilityRole="button"
              accessibilityLabel={
                revealed
                  ? t('trackRow.hideDetailsFor', { title: track.title })
                  : t('trackRow.showDetailsFor', { title: track.title })
              }
              accessibilityState={{ expanded: revealed }}
              style={styles.reveal}
              onPress={() => setRevealed(value => !value)}>
              <Text style={styles.revealLabel}>
                {revealed
                  ? t('trackRow.hideDetails')
                  : t('trackRow.showDetails')}
              </Text>
            </Pressable>
          )}
        </View>
        {revealed && track.failureReason !== null ? (
          <Text
            testID="track-reason"
            selectable
            style={[
              styles.raw,
              { lineHeight: lineHeightFor('text-xs', 'leading-normal', scale) }
            ]}>
            {track.failureReason}
          </Text>
        ) : null}
      </View>

      <View {...copyProps} pointerEvents="none">
        <Text testID="track-duration" style={styles.duration}>
          {duration}
        </Text>
      </View>

      {onOpenActions === undefined ? null : (
        <Pressable
          testID="track-actions"
          accessibilityRole="button"
          accessibilityLabel={t('trackRow.actions', { title: track.title })}
          style={({ pressed }) => [styles.lane, pressed && styles.lanePressed]}
          onPress={() => onOpenActions(track.id)}>
          <IconDots size={tokenLength('icon-md')} color={tokenColor('muted')} />
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3'),
    paddingVertical: tokenLength('space-2'),
    borderBottomWidth: 1,
    borderBottomColor: tokenColor('line')
  },
  rowCurrent: {
    marginHorizontal: -tokenLength('space-2'),
    paddingHorizontal: tokenLength('space-2'),
    borderRadius: tokenLength('radius-card'),
    backgroundColor: tokenColor('current-surface'),
    borderBottomColor: 'transparent'
  },
  art: {
    width: tokenLength('space-9'),
    height: tokenLength('space-9'),
    borderRadius: tokenLength('radius-card'),
    overflow: 'hidden',
    backgroundColor: tokenColor('surface-raised')
  },
  image: {
    width: '100%',
    height: '100%'
  },
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: tokenColor('scrim')
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: tokenLength('space-1')
  },
  title: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: tokenWeight('weight-medium')
  },
  /* The current row steps up one weight, so its state survives without colour. */
  titleCurrent: {
    fontWeight: tokenWeight('weight-semibold')
  },
  sub: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokenLength('space-2')
  },
  nowMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-1')
  },
  nowDot: {
    /* A 5pt dot is the playing mark, not a control. */
    width: 5,
    height: 5,
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('accent')
  },
  now: {
    color: tokenColor('accent'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    fontWeight: tokenWeight('weight-semibold')
  },
  state: {
    fontFamily,
    fontSize: tokenLength('text-xs'),
    fontWeight: tokenWeight('weight-semibold')
  },
  separator: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  source: {
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  sentence: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  reveal: {
    minHeight: touchTarget,
    justifyContent: 'center',
    padding: 0
  },
  revealLabel: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    textDecorationLine: 'underline'
  },
  raw: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    padding: tokenLength('space-2'),
    borderWidth: 1,
    borderColor: tokenColor('line'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('surface-raised')
  },
  duration: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontVariant: ['tabular-nums']
  },
  lane: {
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control')
  },
  lanePressed: {
    backgroundColor: tokenColor('surface-raised')
  }
});

export default memo(TrackRow);
