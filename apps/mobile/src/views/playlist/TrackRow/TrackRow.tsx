import { IconDots } from '@tabler/icons-react-native';
import { memo, useState } from 'react';
import {
  Animated,
  Image,
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

import type { PlaylistTrack } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { formatDuration, trackStateLabel, useI18n } from '@playliberty/i18n';
import { trackTone } from '@playliberty/ui-foundation';

import { usePressScale } from '../../../shared/components/PressableScale/usePressScale';
import TrackBars from '../../../shared/components/TrackBars/TrackBars';
import { mediaSource } from '../../../shared/media/mediaSource';
import { isPlayable } from '../../../shared/playable/playable';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../../shared/styles/tokens';
import { failureSentence } from '../../../shared/trackState/failureSentence';
import { trackToneColor } from '../../../shared/trackState/trackToneColor';

import type { ApiConfig } from '../../../auth/useApiConfig';

/* Above this scale the title takes a second line rather than losing its name. */
const MAX_SINGLE_LINE_SCALE = 1.3;

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

/* One track: the artwork, the title, the state word, the duration and, for a
 * failed track, the shared sentence with the server's reason behind a reveal.
 * The whole row is the play target when the file is stored. */
function TrackRow({
  association,
  config,
  current,
  playing,
  onPlay,
  onOpenActions
}: TrackRowProps) {
  const { t } = useI18n();
  const { track } = association;
  const [revealed, setRevealed] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const { pressTo, style: pressStyle } = usePressScale(false);
  const playable = isPlayable(track);
  const stateLabel = trackStateLabel(
    t,
    track.fileStatus,
    track.sourceStatus,
    track.provider
  );
  const tone = trackTone(track.fileStatus, track.sourceStatus);
  const duration =
    track.durationSeconds === null
      ? '--:--'
      : formatDuration(track.durationSeconds);
  const stateWord =
    stateLabel ??
    (current ? t(playing ? 'trackBars.playing' : 'trackBars.paused') : null);
  const label = [track.title, stateWord, duration]
    .filter((part): part is string => part !== null)
    .join(', ');
  const artwork =
    config === null || track.thumbnailPath === null || thumbnailFailed
      ? null
      : mediaSource(config, endpoints.trackThumbnail, {
          trackId: track.id
        });
  const withFailure =
    track.failureKind !== null || track.failureReason !== null;
  const titleLines = PixelRatio.getFontScale() > MAX_SINGLE_LINE_SCALE ? 2 : 1;
  /* The play layer carries the row's name, so the painted copy is not a second
   * stop; the sentence, the disclosure and the lane stay outside it. */
  const copyProps = playable
    ? {
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const
      }
    : {};

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
          onPressIn={() => pressTo(1)}
          onPressOut={() => pressTo(0)}
          onPress={() => onPlay(track.id)}
        />
      ) : null}

      <View testID="track-artwork" pointerEvents="none" style={styles.art}>
        {artwork === null ? null : (
          <Image
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
            numberOfLines={titleLines}
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
            {stateLabel === null ? null : (
              <Text
                testID="track-state"
                style={[styles.state, { color: trackToneColor(tone) }]}>
                {stateLabel}
              </Text>
            )}
          </View>
          {withFailure ? (
            <Text testID="track-failure" style={styles.sentence}>
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
          <Text testID="track-reason" selectable style={styles.raw}>
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
  sentence: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    lineHeight: tokenLength('text-xs') * tokenNumber('leading-normal')
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
    lineHeight: tokenLength('text-xs') * tokenNumber('leading-normal'),
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
