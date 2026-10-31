import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PlaylistTrack } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { formatDuration, trackStateLabel, useI18n } from '@playliberty/i18n';
import { trackTone } from '@playliberty/ui-foundation';

import TrackBars from '../../../shared/components/TrackBars/TrackBars';
import { mediaSource } from '../../../shared/media/mediaSource';
import { isPlayable } from '../../../shared/playable/playable';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber
} from '../../../shared/styles/tokens';
import { failureSentence } from '../../../shared/trackState/failureSentence';
import { trackToneColor } from '../../../shared/trackState/trackToneColor';

import type { ApiConfig } from '../../../auth/useApiConfig';

export interface TrackRowProps {
  readonly association: PlaylistTrack;
  readonly config: ApiConfig | null;
  readonly current: boolean;
  readonly onPlay: (trackId: string) => void;
  /** The lane opens in `04`; this row draws no lane yet. */
  readonly onOpenActions?: () => void;
}

/* One track: the artwork, the title, the state word, the duration and, for a
 * failed track, the shared sentence with the server's reason behind a reveal.
 * The whole row is the play target when the file is stored. */
function TrackRow({ association, config, current, onPlay }: TrackRowProps) {
  const { t } = useI18n();
  const { track } = association;
  const [revealed, setRevealed] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
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
  const stateWord = stateLabel ?? (current ? t('trackBars.playing') : null);
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

  return (
    <View testID="track-row" style={styles.row}>
      {playable ? (
        <Pressable
          testID="track-play"
          accessibilityRole="button"
          accessibilityLabel={label}
          style={StyleSheet.absoluteFill}
          onPress={() => onPlay(track.id)}
        />
      ) : null}

      <View testID="track-artwork" style={styles.art}>
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
        {current ? <TrackBars /> : null}
      </View>

      <View style={styles.body}>
        <Text testID="track-title" numberOfLines={1} style={styles.title}>
          {track.title}
        </Text>
        <View style={styles.sub}>
          {current ? (
            <Text testID="track-now" style={styles.now}>
              {t('trackBars.playing')}
            </Text>
          ) : null}
          {stateLabel === null ? null : (
            <Text
              testID="track-state"
              style={[styles.state, { color: trackToneColor(tone) }]}>
              {stateLabel}
            </Text>
          )}
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

      <Text testID="track-duration" style={styles.duration}>
        {duration}
      </Text>
    </View>
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
  art: {
    width: 48,
    height: 48,
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
    gap: tokenLength('space-1')
  },
  title: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: '500'
  },
  sub: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokenLength('space-2')
  },
  now: {
    color: tokenColor('accent'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    fontWeight: '600'
  },
  state: {
    fontFamily,
    fontSize: tokenLength('text-xs'),
    fontWeight: '600'
  },
  sentence: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    lineHeight: tokenLength('text-xs') * tokenNumber('leading-normal')
  },
  reveal: {
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
  }
});

export default memo(TrackRow);
