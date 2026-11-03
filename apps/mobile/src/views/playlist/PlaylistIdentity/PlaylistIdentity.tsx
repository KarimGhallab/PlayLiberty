import {
  IconArrowsShuffle,
  IconChevronLeft,
  IconDots
} from '@tabler/icons-react-native';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Playlist } from '@playliberty/contracts';
import { PlaylistSyncStatus } from '@playliberty/contracts';
import {
  formatLastSynced,
  syncStateLabel,
  trackCountUnit,
  useI18n
} from '@playliberty/i18n';

import PlayPauseGlyph from '../../../shared/components/PlayPauseGlyph/PlayPauseGlyph';
import PlayingLine from '../../../shared/components/PlayingLine/PlayingLine';
import PressableScale from '../../../shared/components/PressableScale/PressableScale';
import Spinner from '../../../shared/components/Spinner/Spinner';
import { usePlaylistCover } from '../../../shared/playlistCover/usePlaylistCover';
import {
  shareMark,
  shareMarkColor
} from '../../../shared/playlistIdentity/shareMark';
import { syncStateColor } from '../../../shared/playlistIdentity/syncStateColor';
import {
  coverGroundOpacity,
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../../shared/styles/tokens';

import type { ApiConfig } from '../../../auth/useApiConfig';

/* The detail's one header: wide at the top, narrow once the list moves, with
 * the cover as its own backdrop while wide. */

const TOP = 16;
const WIDE_COVER = 136;
const NARROW_COVER = 96;
const WIDE_GAP = 16;
const NARROW_GAP = 12;
const PLAY = 52;
const CONTROL = touchTarget;
const SMALL = 36;
const GAP = 8;
const WIDE_ACTIONS_TOP = TOP + WIDE_COVER + 12;
const NARROW_SMALL_TOP = TOP + NARROW_COVER - SMALL;
const NARROW_BLOCK = SMALL * 2 + GAP;
const WIDE_HEIGHT = WIDE_ACTIONS_TOP + PLAY + 12 + 2;
const NARROW_HEIGHT = TOP + NARROW_COVER + 12 + 2;
const NARROW_IDENTITY_RIGHT = TOP + NARROW_BLOCK + 12;
const SMALL_HIT = (CONTROL - SMALL) / 2;

/* The compact header keeps a fixed height, so its identity stops scaling before
 * the fourth line would spill into the list. */
const MAX_IDENTITY_SCALE = 1.3;

/* The two heights the header moves between, in its own top coordinates. */
export const HEADER_HEIGHT = {
  wide: WIDE_HEIGHT,
  narrow: NARROW_HEIGHT
} as const;

export interface PlaylistIdentityProps {
  readonly playlist: Playlist;
  readonly ownerName: string | null;
  readonly config: ApiConfig | null;
  /* A run that started after the playlist read says the playlist is working. */
  readonly syncing?: boolean;
  readonly now?: Date;
  readonly onPlay?: () => void;
  readonly onShuffle?: () => void;
  readonly onOpenActions?: () => void;
  /** The way out, drawn over the cover's top-left. */
  readonly onBack?: () => void;
  /** The start waiting on its queue read, so that control says so. */
  readonly starting?: 'play' | 'shuffle' | null;
  /** Whether this playlist's queue is the shuffled one on screen. */
  readonly shuffled?: boolean;
  /** Whether this playlist's queue is the one playing. */
  readonly playing?: boolean;
}

export interface PlaylistIdentityViewProps extends PlaylistIdentityProps {
  /** The list's collapse progress, from the top to the compact header. */
  readonly progress: Animated.Value;
  readonly collapsed: boolean;
}

function useFacts({
  playlist,
  ownerName,
  config,
  syncing = false,
  now = new Date()
}: PlaylistIdentityProps) {
  const { t } = useI18n();
  const cover = usePlaylistCover(playlist, config);
  const mark = shareMark(playlist);
  const status = syncing ? PlaylistSyncStatus.Syncing : playlist.syncStatus;
  const lastSyncedAt =
    playlist.lastSyncedAt === null ? null : new Date(playlist.lastSyncedAt);
  const sharedBy =
    playlist.access !== 'owner' && ownerName !== null ? ownerName : null;

  return {
    t,
    cover,
    mark,
    markColor: shareMarkColor(mark),
    state: syncStateLabel(t, status),
    stateColor: syncStateColor(status),
    time: formatLastSynced(t, lastSyncedAt, now),
    count: `${playlist.trackCount} ${trackCountUnit(t, playlist.trackCount)}`,
    sharedBy
  };
}

function PlayControl({
  props,
  size,
  ghost = false
}: {
  readonly props: PlaylistIdentityProps;
  readonly size: number;
  readonly ghost?: boolean;
}) {
  const { t } = useI18n();
  const starting = props.starting === 'play';
  const disabled = props.onPlay === undefined || props.starting !== null;
  const playing = props.playing === true;

  return (
    <PressableScale
      testID={ghost ? undefined : 'detail-play'}
      accessibilityRole="button"
      accessibilityLabel={t(playing ? 'header.pause' : 'header.play')}
      accessibilityState={{ disabled, busy: starting, selected: playing }}
      disabled={disabled}
      style={[
        styles.play,
        { width: size, height: size, borderRadius: size / 2 },
        disabled && styles.disabled
      ]}
      onPress={props.onPlay}>
      {starting ? (
        <Spinner color={tokenColor('bg')} />
      ) : (
        <PlayPauseGlyph
          playing={playing}
          size={tokenLength('icon-md')}
          color={tokenColor('bg')}
        />
      )}
    </PressableScale>
  );
}

function ShuffleControl({
  props,
  ghost = false
}: {
  readonly props: PlaylistIdentityProps;
  readonly ghost?: boolean;
}) {
  const { t } = useI18n();
  const starting = props.starting === 'shuffle';
  const disabled = props.onShuffle === undefined || props.starting !== null;
  const shuffled = props.shuffled === true;

  return (
    <PressableScale
      testID={ghost ? undefined : 'detail-shuffle'}
      accessibilityRole="button"
      accessibilityLabel={t('header.shuffle', { name: props.playlist.name })}
      accessibilityState={{ disabled, selected: shuffled, busy: starting }}
      disabled={disabled}
      hitSlop={SMALL_HIT}
      style={[
        styles.secondary,
        styles.fill,
        shuffled && !disabled && styles.secondaryOn,
        disabled && styles.disabled
      ]}
      onPress={props.onShuffle}>
      {starting ? (
        <Spinner color={tokenColor('muted')} />
      ) : (
        <IconArrowsShuffle
          size={tokenLength('icon-md')}
          color={shuffled ? tokenColor('accent') : tokenColor('muted')}
        />
      )}
    </PressableScale>
  );
}

function ActionsControl({
  props,
  ghost = false
}: {
  readonly props: PlaylistIdentityProps;
  readonly ghost?: boolean;
}) {
  const { t } = useI18n();

  if (props.onOpenActions === undefined) {
    return null;
  }

  return (
    <PressableScale
      testID={ghost ? undefined : 'detail-actions'}
      accessibilityRole="button"
      accessibilityLabel={t('header.actions', { name: props.playlist.name })}
      hitSlop={SMALL_HIT}
      style={[styles.secondary, styles.fill]}
      onPress={props.onOpenActions}>
      <IconDots size={tokenLength('icon-md')} color={tokenColor('muted')} />
    </PressableScale>
  );
}

function IdentityBlock({
  props,
  facts,
  lines
}: {
  readonly props: PlaylistIdentityProps;
  readonly facts: ReturnType<typeof useFacts>;
  readonly lines: number;
}) {
  return (
    <View style={styles.body}>
      <View style={styles.nameRow}>
        <Text
          accessibilityRole="header"
          numberOfLines={lines}
          maxFontSizeMultiplier={MAX_IDENTITY_SCALE}
          testID="playlist-name"
          style={styles.name}>
          {props.playlist.name}
        </Text>
        <View
          testID="playlist-share"
          accessible
          accessibilityRole="image"
          accessibilityLabel={facts.t(facts.mark.label)}>
          <facts.mark.Icon
            size={tokenLength('icon-sm')}
            color={facts.markColor}
          />
        </View>
      </View>
      <View style={styles.meta}>
        <Text
          testID="playlist-sync-state"
          numberOfLines={1}
          maxFontSizeMultiplier={MAX_IDENTITY_SCALE}
          style={[styles.state, { color: facts.stateColor }]}>
          {facts.state}
        </Text>
        <Text
          accessible={false}
          importantForAccessibility="no"
          maxFontSizeMultiplier={MAX_IDENTITY_SCALE}
          style={styles.separator}>
          &middot;
        </Text>
        <Text
          testID="playlist-last-synced"
          numberOfLines={1}
          maxFontSizeMultiplier={MAX_IDENTITY_SCALE}
          style={styles.time}>
          {facts.time}
        </Text>
      </View>
      <Text
        testID="playlist-track-count"
        maxFontSizeMultiplier={MAX_IDENTITY_SCALE}
        style={styles.count}>
        {facts.count}
      </Text>
      {facts.sharedBy === null ? null : (
        <Text
          testID="playlist-owner"
          maxFontSizeMultiplier={MAX_IDENTITY_SCALE}
          style={styles.owner}>
          {facts.t('header.sharedBy', { name: facts.sharedBy })}
        </Text>
      )}
    </View>
  );
}

/* The head's shape while the playlist read lands: the cover, the identity's
 * lines and the action row in the places the real header will take. */
export function PlaylistIdentitySkeleton() {
  return (
    <View testID="playlist-identity-skeleton" style={styles.skeletonRoot}>
      <View
        style={[
          styles.skeletonCover,
          {
            left: TOP,
            top: TOP,
            width: WIDE_COVER,
            height: WIDE_COVER
          }
        ]}
      />
      <View
        style={[
          styles.skeletonIdentity,
          { left: TOP + WIDE_COVER + WIDE_GAP, top: TOP, right: TOP }
        ]}>
        <View style={[styles.skeletonLine, styles.skeletonTitle]} />
        <View style={[styles.skeletonLine, styles.skeletonMeta]} />
        <View style={[styles.skeletonLine, styles.skeletonMetaShort]} />
        <View style={[styles.skeletonLine, styles.skeletonOwner]} />
      </View>
      <View
        style={[
          styles.skeletonPlay,
          {
            left: TOP,
            top: WIDE_ACTIONS_TOP,
            width: PLAY,
            height: PLAY,
            borderRadius: PLAY / 2
          }
        ]}
      />
      <View
        style={[
          styles.skeletonControl,
          {
            right: TOP + CONTROL + GAP,
            top: WIDE_ACTIONS_TOP + (PLAY - CONTROL) / 2,
            width: CONTROL,
            height: CONTROL
          }
        ]}
      />
      <View
        style={[
          styles.skeletonControl,
          {
            right: TOP,
            top: WIDE_ACTIONS_TOP + (PLAY - CONTROL) / 2,
            width: CONTROL,
            height: CONTROL
          }
        ]}
      />
    </View>
  );
}

/* The cover, the identity, the height and the controls all follow the list's
 * offset, so the header scrubs and reverses with the gesture. */
export default function PlaylistIdentity({
  progress,
  collapsed,
  ...props
}: PlaylistIdentityViewProps) {
  const facts = useFacts(props);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const width = window.width - insets.left - insets.right;

  const height = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [WIDE_HEIGHT, NARROW_HEIGHT]
  });
  const coverSize = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [WIDE_COVER, NARROW_COVER]
  });
  const identityLeft = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [TOP + WIDE_COVER + WIDE_GAP, TOP + NARROW_COVER + NARROW_GAP]
  });
  const identityRight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [TOP, NARROW_IDENTITY_RIGHT]
  });
  const identityWidth = Animated.subtract(
    Animated.subtract(width, identityLeft),
    identityRight
  );
  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [coverGroundOpacity, 0]
  });
  const wideOpacity = progress.interpolate({
    inputRange: [0, 0.42, 0.58],
    outputRange: [1, 1, 0]
  });
  const narrowOpacity = progress.interpolate({
    inputRange: [0, 0.42, 0.58],
    outputRange: [0, 0, 1]
  });
  const wideShift = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, NARROW_HEIGHT - WIDE_HEIGHT]
  });
  /* Play leads the wide row and the two secondary controls close it; the
   * smaller two centre on the play's height. */
  const wideActionsTop = WIDE_ACTIONS_TOP + (PLAY - CONTROL) / 2;
  const wideSecondaryLeft = width - TOP - CONTROL - GAP - CONTROL;

  return (
    <Animated.View testID="playlist-identity" style={[styles.root, { height }]}>
      <Animated.View
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[styles.backdrop, { opacity: backdropOpacity }]}>
        {facts.cover.source === null ? (
          <View
            style={[styles.fill, { backgroundColor: facts.cover.sleeve }]}
          />
        ) : (
          <Image
            accessible={false}
            resizeMode="cover"
            source={facts.cover.source}
            style={styles.fill}
            onError={facts.cover.onError}
          />
        )}
      </Animated.View>

      <Animated.View
        testID="playlist-cover"
        style={[
          styles.cover,
          {
            width: coverSize,
            height: coverSize,
            left: TOP,
            top: TOP,
            backgroundColor: facts.cover.sleeve
          }
        ]}>
        {facts.cover.source === null ? null : (
          <Image
            testID="playlist-cover-image"
            accessible={false}
            resizeMode="cover"
            source={facts.cover.source}
            style={styles.fill}
            onError={facts.cover.onError}
          />
        )}
        <View pointerEvents="none" style={styles.coverWash} />
      </Animated.View>

      <Animated.View
        style={[
          styles.identity,
          { left: identityLeft, top: TOP, width: identityWidth }
        ]}>
        <IdentityBlock props={props} facts={facts} lines={collapsed ? 1 : 2} />
      </Animated.View>

      <Animated.View
        pointerEvents={collapsed ? 'none' : 'auto'}
        accessibilityElementsHidden={collapsed}
        importantForAccessibility={collapsed ? 'no-hide-descendants' : 'auto'}
        style={[
          styles.actions,
          { opacity: wideOpacity, transform: [{ translateY: wideShift }] }
        ]}>
        <View
          style={[
            styles.action,
            {
              left: TOP,
              top: WIDE_ACTIONS_TOP,
              width: PLAY,
              height: PLAY
            }
          ]}>
          <PlayControl props={props} size={PLAY} ghost={collapsed} />
        </View>
        <View
          style={[
            styles.action,
            {
              left: wideSecondaryLeft,
              top: wideActionsTop,
              width: CONTROL,
              height: CONTROL
            }
          ]}>
          <ShuffleControl props={props} ghost={collapsed} />
        </View>
        <View
          style={[
            styles.action,
            {
              left: width - TOP - CONTROL,
              top: wideActionsTop,
              width: CONTROL,
              height: CONTROL
            }
          ]}>
          <ActionsControl props={props} ghost={collapsed} />
        </View>
      </Animated.View>

      <Animated.View
        pointerEvents={collapsed ? 'auto' : 'none'}
        accessibilityElementsHidden={!collapsed}
        importantForAccessibility={collapsed ? 'auto' : 'no-hide-descendants'}
        style={[styles.actions, { opacity: narrowOpacity }]}>
        <View
          style={[
            styles.action,
            {
              left: width - TOP - PLAY,
              top: TOP,
              width: PLAY,
              height: PLAY
            }
          ]}>
          <PlayControl props={props} size={PLAY} ghost={!collapsed} />
        </View>
        <View
          style={[
            styles.action,
            {
              left: width - TOP - NARROW_BLOCK,
              top: NARROW_SMALL_TOP,
              width: SMALL,
              height: SMALL
            }
          ]}>
          <ShuffleControl props={props} ghost={!collapsed} />
        </View>
        <View
          style={[
            styles.action,
            {
              left: width - TOP - SMALL,
              top: NARROW_SMALL_TOP,
              width: SMALL,
              height: SMALL
            }
          ]}>
          <ActionsControl props={props} ghost={!collapsed} />
        </View>
      </Animated.View>

      {props.onBack === undefined ? null : (
        <View style={[styles.backSlot, { left: TOP, top: TOP }]}>
          <PressableScale
            testID="detail-back"
            accessibilityRole="button"
            accessibilityLabel={facts.t('common.back')}
            style={styles.back}
            onPress={props.onBack}>
            <IconChevronLeft
              size={tokenLength('icon-md')}
              color={tokenColor('ink')}
            />
          </PressableScale>
        </View>
      )}

      <View pointerEvents="none" style={styles.playingSlot}>
        <PlayingLine playing={props.playing === true} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  skeletonRoot: {
    height: WIDE_HEIGHT
  },
  skeletonCover: {
    position: 'absolute',
    borderRadius: tokenLength('radius-card'),
    backgroundColor: tokenColor('surface-raised')
  },
  skeletonIdentity: {
    position: 'absolute',
    gap: tokenLength('space-2')
  },
  skeletonLine: {
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  skeletonTitle: {
    height: tokenLength('space-4'),
    width: '58%'
  },
  skeletonMeta: {
    height: tokenLength('space-3'),
    width: '44%'
  },
  skeletonMetaShort: {
    height: tokenLength('space-3'),
    width: '33%'
  },
  skeletonOwner: {
    height: tokenLength('space-3'),
    width: '24%'
  },
  skeletonPlay: {
    position: 'absolute',
    backgroundColor: tokenColor('surface-raised')
  },
  skeletonControl: {
    position: 'absolute',
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('surface-raised')
  },
  root: {
    overflow: 'hidden',
    backgroundColor: tokenColor('bg')
  },
  fill: {
    width: '100%',
    height: '100%'
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  cover: {
    position: 'absolute',
    borderRadius: tokenLength('radius-card'),
    overflow: 'hidden'
  },
  /* The wash holds the bare chevron on any artwork; the scrim fades below it. */
  coverWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: touchTarget + tokenLength('space-5'),
    experimental_backgroundImage: `linear-gradient(to bottom, ${tokenColor('scrim')} 0%, ${tokenColor('scrim')} 50%, transparent 100%)`
  },
  identity: {
    position: 'absolute'
  },
  action: {
    position: 'absolute'
  },
  backSlot: {
    position: 'absolute',
    width: CONTROL,
    height: CONTROL
  },
  back: {
    width: CONTROL,
    height: CONTROL,
    alignItems: 'center',
    justifyContent: 'center',
    /* The glyph aligns with the cover's edge; the target reaches into the
     * margin. */
    marginLeft: -(CONTROL - tokenLength('icon-md')) / 2
  },
  actions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: tokenLength('space-1')
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-1')
  },
  name: {
    flexShrink: 1,
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-xl'),
    fontWeight: tokenWeight('weight-semibold'),
    lineHeight: tokenLength('text-xl') * tokenNumber('leading-tight')
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-1')
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
  time: {
    flexShrink: 1,
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  count: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  owner: {
    color: tokenColor('shared'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  play: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokenColor('accent')
  },
  secondary: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control')
  },
  secondaryOn: {
    borderColor: tokenColor('accent')
  },
  playingSlot: {
    position: 'absolute',
    left: TOP,
    right: TOP,
    bottom: 0,
    height: 2
  },
  disabled: {
    opacity: tokenNumber('opacity-disabled')
  }
});
