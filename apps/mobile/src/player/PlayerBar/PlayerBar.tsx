import {
  IconPlayerSkipBack,
  IconPlayerSkipForward
} from '@tabler/icons-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  type GestureResponderHandlers,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { endpoints } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import { useReduceMotion } from '../../shared/a11y/useReduceMotion';
import Notice from '../../shared/components/Notice/Notice';
import PlayPauseGlyph from '../../shared/components/PlayPauseGlyph/PlayPauseGlyph';
import PressableScale from '../../shared/components/PressableScale/PressableScale';
import { type MediaSource, mediaSource } from '../../shared/media/mediaSource';
import { sleeveColor } from '../../shared/styles/sleeve';
import {
  barScrimOpacity,
  barVeilOpacity,
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../shared/styles/tokens';

import type { ApiConfig } from '../../auth/useApiConfig';
import {
  usePlayerBarHeight,
  useSetPlayerBarHeight
} from '../playerBarSize/PlayerBarSizeContext';
import { playerBarHeight } from '../playerBarSize/playerBarSize';
import { usePlayerStore } from '../playerStore/playerStore';
import type { PlayerTrack } from '../playerTrack/playerTrack';
import Artwork from './Artwork';
import SeekBar, { type SeekBarProps } from './SeekBar';

/*
 * The player bar: absent at rest and once playback exists it persists across
 * routes, like the music. A horizontal swipe moves the queue; the neighbouring
 * track's bar slides in with the finger, so the next player takes this one's
 * place instead of replacing it after the fact.
 */

export interface PlayerBarProps {
  readonly config: ApiConfig | null;
}

interface BarState {
  readonly track: PlayerTrack;
  readonly playlistId: string | null;
  readonly playlistName: string | null;
  readonly playlistCoverUpdatedAt: string | null;
  readonly playlistCoverTrackId: string | null;
  readonly isPlaying: boolean;
  readonly hasNext: boolean;
  readonly previousId: string | null;
  readonly nextId: string | null;
  readonly queueLabel: string;
  readonly queueIndex: number;
  readonly queueLength: number;
  readonly tracks: Readonly<Record<string, PlayerTrack>>;
  readonly setPlaying: (playing: boolean) => void;
  readonly skipPrevious: () => void;
  readonly skipNext: () => void;
  readonly play: (trackId: string) => void;
  readonly seekToFraction: (fraction: number) => void;
  readonly seekBy: (seconds: number) => void;
}

interface BarView {
  readonly track: PlayerTrack;
  readonly playlistId: string | null;
  readonly playlistName: string | null;
  readonly playlistCoverUpdatedAt: string | null;
  readonly playlistCoverTrackId: string | null;
  readonly isPlaying: boolean;
  readonly queueLabel: string;
}

function useBarState(): BarState | null {
  const currentId = usePlayerStore(state => state.currentId);
  const track = usePlayerStore(state =>
    state.currentId === null ? undefined : state.tracks[state.currentId]
  );
  const playlistId = usePlayerStore(state => state.playlistId);
  const playlistName = usePlayerStore(state => state.playlistName);
  const playlistCoverUpdatedAt = usePlayerStore(
    state => state.playlistCoverUpdatedAt
  );
  const playlistCoverTrackId = usePlayerStore(
    state => state.playlistCoverTrackId
  );
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const setPlaying = usePlayerStore(state => state.setPlaying);
  const queue = usePlayerStore(state => state.queue);
  const tracks = usePlayerStore(state => state.tracks);
  const skipNext = usePlayerStore(state => state.skipNext);
  const skipPrevious = usePlayerStore(state => state.skipPrevious);
  const play = usePlayerStore(state => state.play);
  const seekToFraction = usePlayerStore(state => state.seekToFraction);
  const seekBy = usePlayerStore(state => state.seekBy);

  if (currentId === null || track === undefined) {
    return null;
  }

  const index = queue.indexOf(currentId);
  const previousId = index > 0 ? (queue[index - 1] ?? null) : null;
  const nextId = index >= 0 ? (queue[index + 1] ?? null) : null;

  return {
    track,
    playlistId,
    playlistName,
    playlistCoverUpdatedAt,
    playlistCoverTrackId,
    isPlaying,
    hasNext: nextId !== null,
    previousId,
    nextId,
    queueLabel: index >= 0 ? `${index + 1}/${queue.length}` : '',
    queueIndex: index,
    queueLength: queue.length,
    tracks,
    setPlaying,
    skipPrevious,
    skipNext,
    play,
    seekToFraction,
    seekBy
  };
}

function currentView(bar: BarState): BarView {
  return {
    track: bar.track,
    playlistId: bar.playlistId,
    playlistName: bar.playlistName,
    playlistCoverUpdatedAt: bar.playlistCoverUpdatedAt,
    playlistCoverTrackId: bar.playlistCoverTrackId,
    isPlaying: bar.isPlaying,
    queueLabel: bar.queueLabel
  };
}

function neighbourView(
  bar: BarState,
  trackId: string,
  offset: number
): BarView | null {
  const track = bar.tracks[trackId];

  if (track === undefined) {
    return null;
  }

  return {
    track,
    playlistId: bar.playlistId,
    playlistName: bar.playlistName,
    playlistCoverUpdatedAt: bar.playlistCoverUpdatedAt,
    playlistCoverTrackId: bar.playlistCoverTrackId,
    isPlaying: bar.isPlaying,
    queueLabel: `${bar.queueIndex + offset + 1}/${bar.queueLength}`
  };
}

/** The playlist's cover chain for the veil, with the track as the bare
 * fallback. The cards' chain is the same; the bar only holds the fields. */
function coverSource(
  config: ApiConfig | null,
  view: BarView
): MediaSource | null {
  if (config === null) {
    return null;
  }

  if (view.playlistId !== null && view.playlistCoverUpdatedAt !== null) {
    const source = mediaSource(config, endpoints.playlistCover, {
      playlistId: view.playlistId
    });

    return {
      ...source,
      uri: `${source.uri}?v=${encodeURIComponent(view.playlistCoverUpdatedAt)}`
    };
  }

  if (view.playlistId !== null && view.playlistCoverTrackId !== null) {
    return mediaSource(config, endpoints.trackThumbnail, {
      trackId: view.playlistCoverTrackId
    });
  }

  if (view.track.thumbnailPath !== null) {
    return mediaSource(config, endpoints.trackThumbnail, {
      trackId: view.track.id
    });
  }

  return null;
}

interface StepButtonProps {
  readonly direction: 'previous' | 'next';
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly size?: number;
}

function StepButton({
  direction,
  label,
  onPress,
  disabled = false,
  size = touchTarget
}: StepButtonProps) {
  const Glyph =
    direction === 'previous' ? IconPlayerSkipBack : IconPlayerSkipForward;

  return (
    <PressableScale
      testID={direction === 'previous' ? 'player-previous' : 'player-next'}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={size < touchTarget ? (touchTarget - size) / 2 : 0}
      onPress={onPress}
      style={[
        styles.step,
        { width: size, height: size },
        disabled && styles.stepDisabled
      ]}>
      <Glyph
        size={tokenLength('icon-md')}
        color={disabled ? tokenColor('control-disabled-fg') : tokenColor('ink')}
      />
    </PressableScale>
  );
}

function PlayOrb({
  isPlaying,
  title,
  onToggle,
  size
}: {
  readonly isPlaying: boolean;
  readonly title: string;
  readonly onToggle: () => void;
  readonly size: number;
}) {
  const { t } = useI18n();

  return (
    <PressableScale
      testID="player-toggle"
      accessibilityRole="button"
      accessibilityLabel={
        isPlaying
          ? t('playerBar.pauseNamed', { title })
          : t('playerBar.playNamed', { title })
      }
      accessibilityState={{ selected: isPlaying }}
      hitSlop={(touchTarget - size > 0 ? touchTarget - size : 0) / 2 + 4}
      onPress={onToggle}
      style={[
        styles.orb,
        { width: size, height: size, borderRadius: size / 2 }
      ]}>
      {isPlaying ? (
        <PlayPauseGlyph playing size={size * 0.5} color={tokenColor('bg')} />
      ) : (
        <PlayPauseGlyph
          playing={false}
          size={size * 0.5}
          color={tokenColor('bg')}
        />
      )}
    </PressableScale>
  );
}

function Title({ view }: { readonly view: BarView }) {
  return (
    <Text testID="player-title" numberOfLines={1} style={styles.title}>
      {view.track.title}
    </Text>
  );
}

function Meta({ view }: { readonly view: BarView }) {
  return (
    <View style={styles.meta}>
      {view.playlistName === null ? null : (
        <Text
          testID="player-playlist"
          numberOfLines={1}
          style={styles.playlist}>
          {view.playlistName}
        </Text>
      )}
      <Text testID="player-queue" style={styles.count}>
        {view.queueLabel}
      </Text>
    </View>
  );
}

/* The one subscription to the position: only this rail repaints on a tick. */
function LiveSeekBar(props: Omit<SeekBarProps, 'positionSeconds'>) {
  const positionSeconds = usePlayerStore(state => state.positionSeconds);

  return <SeekBar {...props} positionSeconds={positionSeconds} />;
}

interface BarPageProps {
  readonly config: ApiConfig | null;
  readonly bar: BarState;
  readonly view: BarView;
  readonly translateX: Animated.Value | Animated.AnimatedAddition<number>;
  readonly interactive: boolean;
  readonly onHeight?: (height: number) => void;
  readonly panHandlers?: GestureResponderHandlers;
}

function BarPage({
  config,
  bar,
  view,
  translateX,
  interactive,
  onHeight,
  panHandlers
}: BarPageProps) {
  const { t } = useI18n();
  const cover = coverSource(config, view);
  const [coverFailed, setCoverFailed] = useState(false);
  const base =
    view.playlistId === null
      ? tokenColor('surface-raised')
      : sleeveColor(view.playlistId);
  const wasPlaying = useRef(false);

  useEffect(() => {
    setCoverFailed(false);
  }, [cover?.uri]);

  const startScrub = useCallback((): void => {
    wasPlaying.current = usePlayerStore.getState().isPlaying;

    if (wasPlaying.current) {
      bar.setPlaying(false);
    }
  }, [bar]);

  const endScrub = useCallback((): void => {
    if (wasPlaying.current) {
      bar.setPlaying(true);
    }

    wasPlaying.current = false;
  }, [bar]);

  return (
    <Animated.View
      testID={interactive ? 'player-bar-capsule' : undefined}
      onLayout={event => onHeight?.(event.nativeEvent.layout.height)}
      pointerEvents={interactive ? 'auto' : 'none'}
      importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!interactive}
      {...panHandlers}
      style={[
        styles.capsule,
        { backgroundColor: base, transform: [{ translateX }] }
      ]}>
      {cover !== null && !coverFailed ? (
        <>
          <Image
            testID="player-cover-veil"
            source={cover}
            resizeMode="cover"
            style={[StyleSheet.absoluteFill, styles.veilImage]}
            onError={() => setCoverFailed(true)}
          />
          <View style={[StyleSheet.absoluteFill, styles.veilScrim]} />
        </>
      ) : null}
      <View style={styles.top}>
        <Artwork
          config={config}
          track={view.track}
          playlistId={view.playlistId}
          playlistName={view.playlistName}
          size={tokenLength('space-9') - tokenLength('space-1')}
          radius={tokenLength('space-2')}
        />
        <View style={styles.identity}>
          <Title view={view} />
          <Meta view={view} />
        </View>
        <PlayOrb
          isPlaying={view.isPlaying}
          title={view.track.title}
          onToggle={() => bar.setPlaying(!view.isPlaying)}
          size={tokenLength('space-7') + 8}
        />
      </View>
      <View style={styles.bottom}>
        <StepButton
          direction="previous"
          label={t('playerBar.previousNamed', { title: view.track.title })}
          onPress={bar.skipPrevious}
          size={tokenLength('space-7') + 8}
        />
        <View style={styles.rail}>
          {interactive ? (
            <LiveSeekBar
              key={view.track.id}
              durationSeconds={view.track.durationSeconds}
              onSeekStart={startScrub}
              onSeekEnd={endScrub}
              onSeek={bar.seekToFraction}
              onSeekBy={bar.seekBy}
            />
          ) : (
            <SeekBar
              key={view.track.id}
              durationSeconds={view.track.durationSeconds}
              positionSeconds={0}
              onSeekStart={startScrub}
              onSeekEnd={endScrub}
              onSeek={bar.seekToFraction}
              onSeekBy={bar.seekBy}
            />
          )}
        </View>
        <StepButton
          direction="next"
          label={t('playerBar.nextNamed', { title: view.track.title })}
          onPress={bar.skipNext}
          disabled={!bar.hasNext}
          size={tokenLength('space-7') + 8}
        />
      </View>
    </Animated.View>
  );
}

type SwipeDirection = 'previous' | 'next';

export default function PlayerBar({ config }: PlayerBarProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bar = useBarState();
  const publishedHeight = usePlayerBarHeight();
  const setBarHeight = useSetPlayerBarHeight();
  const reduceMotion = useReduceMotion();
  const swipe = useRef(new Animated.Value(0)).current;
  const [direction, setDirection] = useState<SwipeDirection | null>(null);
  const playbackFailureId = usePlayerStore(state => state.playbackFailureId);
  const dismissPlaybackFailure = usePlayerStore(
    state => state.dismissPlaybackFailure
  );
  const backgroundNotice = usePlayerStore(state => state.backgroundNotice);
  const dismissBackgroundNotice = usePlayerStore(
    state => state.dismissBackgroundNotice
  );

  /* The reset waits for the new track to render, so the deck never rests on the
   * outgoing content for a frame after the swap. */
  useEffect(() => {
    swipe.setValue(0);
    setDirection(current => (current === null ? current : null));
  }, [bar?.track.id, swipe]);

  const previousId = bar?.previousId ?? null;
  const nextId = bar?.nextId ?? null;
  const play = bar?.play;

  /* The capsule plus the 4pt bottom offset and the 2pt gap the screens keep
   * above it, so a 92pt capsule publishes the 98pt the constant named. */
  const publishHeight = useCallback(
    (height: number) => setBarHeight(height + 6),
    [setBarHeight]
  );

  const previousView =
    bar !== null && previousId !== null
      ? neighbourView(bar, previousId, -1)
      : null;
  const nextView =
    bar !== null && nextId !== null ? neighbourView(bar, nextId, 1) : null;
  const incoming =
    direction === 'previous'
      ? previousView
      : direction === 'next'
        ? nextView
        : null;

  const settleBack = useCallback((): void => {
    /* The incoming page stays mounted while the deck retracts, so it leaves
     * with the current one instead of vanishing. A new drag supersedes the
     * spring, which reports unfinished and keeps the newer direction. */
    Animated.spring(swipe, {
      toValue: 0,
      speed: 18,
      bounciness: 0,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setDirection(null);
      }
    });
  }, [swipe]);

  const complete = useCallback(
    (trackId: string, toValue: number): void => {
      if (play === undefined) {
        return;
      }

      if (reduceMotion) {
        play(trackId);
        return;
      }

      Animated.timing(swipe, {
        toValue,
        duration: 260,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true
      }).start(({ finished }) => {
        if (finished) {
          play(trackId);
        }
      });
    },
    [play, reduceMotion, swipe]
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_event, gesture) => {
          const directionNow: SwipeDirection =
            gesture.dx > 0 ? 'previous' : 'next';
          const allowed =
            directionNow === 'previous' ? previousId !== null : nextId !== null;

          if (!allowed) {
            const resisted = gesture.dx * 0.045;
            swipe.setValue(Math.max(-28, Math.min(28, resisted)));
            return;
          }

          swipe.setValue(Math.max(-width, Math.min(width, gesture.dx)));

          if (Math.abs(gesture.dx) > 6) {
            setDirection(current =>
              current === directionNow ? current : directionNow
            );
          }
        },
        onPanResponderRelease: (_event, gesture) => {
          const directionNow: SwipeDirection =
            gesture.dx > 0 ? 'previous' : 'next';
          const trackId = directionNow === 'previous' ? previousId : nextId;
          const committed =
            trackId !== null &&
            (Math.abs(gesture.dx) > width * 0.26 ||
              (Math.abs(gesture.vx) > 0.4 && Math.abs(gesture.dx) > 24));

          if (committed && trackId !== null) {
            complete(trackId, directionNow === 'previous' ? width : -width);
            return;
          }

          settleBack();
        },
        onPanResponderTerminate: settleBack
      }),
    [complete, nextId, previousId, settleBack, swipe, width]
  );

  if (bar === null) {
    return null;
  }

  const failureTitle =
    playbackFailureId === bar.track.id ? bar.track.title : null;

  return (
    <>
      <View
        testID="player-bar"
        pointerEvents="box-none"
        style={[
          styles.deck,
          { bottom: insets.bottom + 4, height: publishedHeight - 6 }
        ]}>
        {incoming === null ? null : (
          <BarPage
            config={config}
            bar={bar}
            view={incoming}
            translateX={Animated.add(
              swipe,
              direction === 'previous' ? -width : width
            )}
            interactive={false}
          />
        )}
        <BarPage
          config={config}
          bar={bar}
          view={currentView(bar)}
          translateX={swipe}
          interactive
          onHeight={publishHeight}
          panHandlers={pan.panHandlers}
        />
      </View>
      {failureTitle !== null ? (
        <Notice
          message={t('playerBar.failed', { title: failureTitle })}
          detail={t('playerBar.failedDetail')}
          onDismiss={dismissPlaybackFailure}
          bottomOffset={publishedHeight + tokenLength('space-2')}
        />
      ) : backgroundNotice ? (
        <Notice
          message={t('playerBar.notificationRefused')}
          onDismiss={dismissBackgroundNotice}
          bottomOffset={publishedHeight + tokenLength('space-2')}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  deck: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: tokenNumber('z-player')
  },
  capsule: {
    position: 'absolute',
    left: tokenLength('space-2'),
    right: tokenLength('space-2'),
    bottom: 0,
    overflow: 'hidden',
    elevation: tokenNumber('z-player') + 2,
    minHeight: playerBarHeight - 6,
    gap: tokenLength('space-1'),
    paddingHorizontal: tokenLength('space-3'),
    paddingVertical: tokenLength('space-1'),
    borderRadius: tokenLength('space-3'),
    borderWidth: 1,
    borderColor: tokenColor('line')
  },
  veilImage: {
    opacity: barVeilOpacity
  },
  veilScrim: {
    backgroundColor: tokenColor('bg'),
    opacity: barScrimOpacity
  },
  top: {
    minHeight: tokenLength('space-9'),
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3')
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-1')
  },
  rail: {
    flex: 1
  },
  identity: {
    flex: 1,
    gap: 2
  },
  title: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: tokenWeight('weight-semibold'),
    lineHeight: tokenLength('text-md') * tokenNumber('leading-tight')
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-1')
  },
  playlist: {
    flexShrink: 1,
    color: tokenColor('muted-on-art'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    lineHeight: tokenLength('text-xs') * tokenNumber('leading-normal')
  },
  count: {
    color: tokenColor('accent-on-art'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    fontWeight: tokenWeight('weight-semibold'),
    lineHeight: tokenLength('text-xs') * tokenNumber('leading-normal')
  },
  step: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokenLength('radius-chip')
  },
  stepDisabled: {
    opacity: tokenNumber('opacity-disabled')
  },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokenColor('accent')
  }
});
