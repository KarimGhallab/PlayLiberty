import {
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward
} from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { endpoints } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import { mediaSource } from '../../shared/media/mediaSource';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../shared/styles/tokens';

import type { ApiConfig } from '../../auth/useApiConfig';
import { playerBarHeight } from '../playerBarSize/playerBarSize';
import { usePlayerStore } from '../playerStore/playerStore';

export interface PlayerBarProps {
  readonly config: ApiConfig | null;
}

/*
 * The player bar: absent at rest and once playback exists it persists across
 * routes, like the music. The artwork is the way back to the queue's playlist;
 * a bare track has none to offer.
 */
export default function PlayerBar({ config }: PlayerBarProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const currentId = usePlayerStore(state => state.currentId);
  const track = usePlayerStore(state =>
    state.currentId === null ? undefined : state.tracks[state.currentId]
  );
  const playlistId = usePlayerStore(state => state.playlistId);
  const playlistName = usePlayerStore(state => state.playlistName);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const setPlaying = usePlayerStore(state => state.setPlaying);
  const queue = usePlayerStore(state => state.queue);
  const skipNext = usePlayerStore(state => state.skipNext);
  const skipPrevious = usePlayerStore(state => state.skipPrevious);
  const [failedId, setFailedId] = useState<string | null>(null);

  if (currentId === null || track === undefined) {
    return null;
  }

  const imageFailed = failedId === track.id;
  const currentIndex = queue.indexOf(currentId);
  const hasNext = currentIndex >= 0 && queue[currentIndex + 1] !== undefined;

  const artwork =
    config === null || track.thumbnailPath === null || imageFailed
      ? null
      : mediaSource(config, endpoints.trackThumbnail, {
          trackId: track.id
        });
  const image =
    artwork === null ? (
      <View testID="player-bar-no-artwork" style={styles.noArtwork} />
    ) : (
      <Image
        testID="player-bar-artwork"
        accessible={false}
        source={artwork}
        style={styles.image}
        onError={() => setFailedId(track.id)}
      />
    );
  const art =
    playlistId === null ? (
      <View testID="player-bar-art" style={styles.art}>
        {image}
      </View>
    ) : (
      <Pressable
        testID="player-open-playlist"
        accessibilityRole="button"
        accessibilityLabel={t('playerBar.openPlaylist', {
          name: playlistName ?? ''
        })}
        style={styles.art}
        onPress={() =>
          router.navigate({
            pathname: '/playlists/[playlistId]',
            params: { playlistId }
          })
        }>
        {image}
      </Pressable>
    );

  return (
    <View testID="player-bar" style={[styles.bar, { bottom: insets.bottom }]}>
      {art}
      <View style={styles.identity}>
        <Text testID="player-title" numberOfLines={1} style={styles.title}>
          {track.title}
        </Text>
        {playlistName === null ? null : (
          <Text
            testID="player-playlist"
            numberOfLines={1}
            style={styles.playlist}>
            {playlistName}
          </Text>
        )}
      </View>
      <View style={styles.transport}>
        <Pressable
          testID="player-previous"
          accessibilityRole="button"
          accessibilityLabel={t('playerBar.previousNamed', {
            title: track.title
          })}
          style={({ pressed }) => [styles.step, pressed && styles.stepPressed]}
          onPress={skipPrevious}>
          <IconPlayerSkipBack
            size={tokenLength('icon-md')}
            color={tokenColor('ink')}
          />
        </Pressable>
        <Pressable
          testID="player-toggle"
          accessibilityRole="button"
          accessibilityLabel={
            isPlaying
              ? t('playerBar.pauseNamed', { title: track.title })
              : t('playerBar.playNamed', { title: track.title })
          }
          accessibilityState={{ selected: isPlaying }}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
          onPress={() => setPlaying(!isPlaying)}>
          {isPlaying ? (
            <IconPlayerPause
              size={tokenLength('icon-lg')}
              color={tokenColor('ink')}
            />
          ) : (
            <IconPlayerPlay
              size={tokenLength('icon-lg')}
              color={tokenColor('ink')}
            />
          )}
        </Pressable>
        <Pressable
          testID="player-next"
          accessibilityRole="button"
          accessibilityLabel={t('playerBar.nextNamed', {
            title: track.title
          })}
          accessibilityState={{ disabled: !hasNext }}
          disabled={!hasNext}
          style={({ pressed }) => [
            styles.step,
            !hasNext && styles.stepDisabled,
            pressed && styles.stepPressed
          ]}
          onPress={skipNext}>
          <IconPlayerSkipForward
            size={tokenLength('icon-md')}
            color={
              hasNext ? tokenColor('ink') : tokenColor('control-disabled-fg')
            }
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: tokenNumber('z-player'),
    elevation: tokenNumber('z-player'),
    height: playerBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3'),
    paddingHorizontal: tokenLength('space-4'),
    borderTopWidth: 1,
    borderTopColor: tokenColor('line'),
    backgroundColor: tokenColor('surface')
  },
  art: {
    width: tokenLength('space-9'),
    height: tokenLength('space-9'),
    overflow: 'hidden',
    borderRadius: tokenLength('radius-artwork'),
    backgroundColor: tokenColor('surface-raised')
  },
  image: {
    width: '100%',
    height: '100%'
  },
  noArtwork: {
    flex: 1
  },
  identity: {
    flex: 1,
    gap: tokenLength('space-1')
  },
  title: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: '600',
    lineHeight: tokenLength('text-md') * tokenNumber('leading-tight')
  },
  playlist: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    lineHeight: tokenLength('text-xs') * tokenNumber('leading-normal')
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-1')
  },
  step: {
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokenLength('radius-chip')
  },
  stepPressed: {
    backgroundColor: tokenColor('current-surface')
  },
  stepDisabled: {
    opacity: tokenNumber('opacity-disabled')
  },
  toggle: {
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  pressed: {
    backgroundColor: tokenColor('current-surface')
  }
});
