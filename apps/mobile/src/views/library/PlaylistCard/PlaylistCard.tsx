import {
  IconArrowsShuffle,
  IconDots,
  IconDownload
} from '@tabler/icons-react-native';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { PlaylistWithCounts } from '@playliberty/contracts';
import { TrackFileStatus } from '@playliberty/contracts';
import { syncStateLabel, trackCountUnit, useI18n } from '@playliberty/i18n';

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
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../../shared/styles/tokens';

import type { ApiConfig } from '../../../auth/useApiConfig';

export interface PlaylistCardProps {
  readonly playlist: PlaylistWithCounts;
  readonly ownerName: string | null;
  readonly config: ApiConfig | null;
  readonly onOpen: () => void;
  readonly onOpenActions: () => void;
  readonly onPlay: () => void;
  readonly onShuffle: () => void;
  /** The start this card is waiting on, so that control says so. */
  readonly starting?: 'play' | 'shuffle' | null;
  /** Whether this playlist's queue is the one playing. */
  readonly playing?: boolean;
  readonly shuffled?: boolean;
  readonly actionsTestID?: string;
}

type MissingState =
  | TrackFileStatus.Pending
  | TrackFileStatus.Downloading
  | TrackFileStatus.Failed
  | TrackFileStatus.Unavailable;

const MISSING: readonly MissingState[] = [
  TrackFileStatus.Pending,
  TrackFileStatus.Downloading,
  TrackFileStatus.Failed,
  TrackFileStatus.Unavailable
];

/* Worst wins, because a break is louder news than a wait. */
const SEVERITY: readonly MissingState[] = [
  TrackFileStatus.Failed,
  TrackFileStatus.Unavailable,
  TrackFileStatus.Downloading,
  TrackFileStatus.Pending
];

/* The card's cell is fixed, so its meta stops scaling before the row collides. */
const MAX_CARD_SCALE = 1.3;

const TONE_COLORS: Record<
  MissingState,
  'tone-pending' | 'tone-downloading' | 'tone-failed' | 'tone-unavailable'
> = {
  [TrackFileStatus.Pending]: 'tone-pending',
  [TrackFileStatus.Downloading]: 'tone-downloading',
  [TrackFileStatus.Failed]: 'tone-failed',
  [TrackFileStatus.Unavailable]: 'tone-unavailable'
};

interface Incomplete {
  readonly missing: number;
  readonly tone: MissingState;
}

function incompleteOf(counts: PlaylistWithCounts['counts']): Incomplete | null {
  const missing = MISSING.reduce((sum, state) => sum + counts[state], 0);

  if (missing === 0) {
    return null;
  }

  const tone =
    SEVERITY.find(state => counts[state] > 0) ?? TrackFileStatus.Pending;

  return { missing, tone };
}

/* The gallery's one card: the detail's hero arrangement at a phone's width.
 * Its play starts the playlist or toggles the queue it owns. */
export default function PlaylistCard({
  playlist,
  ownerName,
  config,
  onOpen,
  onOpenActions,
  onPlay,
  onShuffle,
  starting = null,
  playing = false,
  shuffled = false,
  actionsTestID
}: PlaylistCardProps) {
  const { t } = useI18n();
  const cover = usePlaylistCover(playlist, config);
  const mark = shareMark(playlist);
  const incomplete = incompleteOf(playlist.counts);
  const sharedBy = playlist.access === 'owner' ? null : ownerName;
  /* The card is one target, so its name carries everything the visible parts
   * say: the mark, the count, the sync state and the owner. */
  const cardLabel = [
    playlist.name,
    t(mark.label),
    `${playlist.trackCount} ${trackCountUnit(t, playlist.trackCount)}`,
    syncStateLabel(t, playlist.syncStatus),
    sharedBy === null ? null : t('header.sharedBy', { name: sharedBy })
  ]
    .filter((part): part is string => part !== null)
    .join(', ');
  const [width, setWidth] = useState(0);
  const shareColor = shareMarkColor(mark);
  const playTop = Math.max(0, width - touchTarget - tokenLength('space-2'));
  const busy = starting !== null;
  const nothingStored = playlist.counts.stored === 0;
  const playDisabled = nothingStored || busy;
  const shuffleDisabled = nothingStored || busy;

  return (
    <PressableScale
      testID="playlist-card"
      accessibilityRole="button"
      accessibilityLabel={cardLabel}
      style={styles.card}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      onPress={onOpen}>
      <View
        style={styles.content}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <View
          testID="playlist-cover"
          style={[styles.cover, { backgroundColor: cover.sleeve }]}>
          {cover.source === null ? null : (
            <Image
              testID="playlist-cover-image"
              accessible={false}
              source={cover.source}
              style={styles.image}
              onError={cover.onError}
            />
          )}
        </View>

        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {playlist.name}
          </Text>
          <View testID="playlist-share">
            <mark.Icon size={tokenLength('icon-sm')} color={shareColor} />
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.countRow}>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={MAX_CARD_SCALE}
              style={styles.count}>
              {playlist.trackCount} {trackCountUnit(t, playlist.trackCount)}
            </Text>
            {incomplete === null ? null : (
              <View testID="playlist-incomplete" style={styles.incomplete}>
                <IconDownload
                  size={tokenLength('icon-sm')}
                  color={tokenColor(TONE_COLORS[incomplete.tone])}
                />
                <Text
                  maxFontSizeMultiplier={MAX_CARD_SCALE}
                  style={[
                    styles.incompleteCount,
                    { color: tokenColor(TONE_COLORS[incomplete.tone]) }
                  ]}>
                  {incomplete.missing}
                </Text>
              </View>
            )}
          </View>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={MAX_CARD_SCALE}
            style={[
              styles.state,
              { color: syncStateColor(playlist.syncStatus) }
            ]}>
            {syncStateLabel(t, playlist.syncStatus)}
          </Text>
        </View>

        {sharedBy === null ? null : (
          <Text
            numberOfLines={2}
            maxFontSizeMultiplier={MAX_CARD_SCALE}
            style={styles.owner}>
            {t('header.sharedBy', { name: sharedBy })}
          </Text>
        )}
      </View>

      <PressableScale
        testID="playlist-play"
        accessibilityRole="button"
        accessibilityLabel={t(
          playing ? 'header.pauseNamed' : 'header.playNamed',
          { name: playlist.name }
        )}
        accessibilityState={{
          disabled: playDisabled,
          busy: starting === 'play'
        }}
        disabled={playDisabled}
        style={[
          styles.play,
          { top: playTop },
          playing && !playDisabled && styles.playOn,
          playDisabled && styles.playDisabled
        ]}
        onPress={onPlay}>
        {starting === 'play' ? (
          <Spinner color={tokenColor(playing ? 'bg' : 'muted')} />
        ) : (
          <PlayPauseGlyph
            playing={playing}
            size={tokenLength('icon-md')}
            color={tokenColor(playing ? 'bg' : 'ink')}
          />
        )}
      </PressableScale>

      <PressableScale
        testID="playlist-shuffle"
        accessibilityRole="button"
        accessibilityLabel={t('header.shuffle', { name: playlist.name })}
        accessibilityState={{
          disabled: shuffleDisabled,
          selected: shuffled,
          busy: starting === 'shuffle'
        }}
        disabled={shuffleDisabled}
        style={[
          styles.shuffle,
          { top: playTop },
          shuffled && !shuffleDisabled && styles.shuffleOn,
          shuffleDisabled && styles.playDisabled
        ]}
        onPress={onShuffle}>
        {starting === 'shuffle' ? (
          <Spinner color={tokenColor('muted')} />
        ) : (
          <IconArrowsShuffle
            size={tokenLength('icon-md')}
            color={shuffled ? tokenColor('accent') : tokenColor('ink')}
          />
        )}
      </PressableScale>

      <PressableScale
        testID={actionsTestID ?? 'playlist-actions'}
        accessibilityRole="button"
        accessibilityLabel={t('header.actions', { name: playlist.name })}
        style={styles.actions}
        onPress={onOpenActions}>
        <IconDots size={tokenLength('icon-md')} color={tokenColor('ink')} />
      </PressableScale>

      <PlayingLine playing={playing} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    paddingBottom: tokenLength('space-2')
  },
  content: {
    gap: tokenLength('space-2')
  },
  cover: {
    aspectRatio: 1,
    borderRadius: tokenLength('radius-card'),
    overflow: 'hidden'
  },
  image: {
    width: '100%',
    height: '100%'
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
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-semibold')
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokenLength('space-2')
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-1'),
    flexShrink: 1
  },
  count: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  incomplete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  incompleteCount: {
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  state: {
    flexShrink: 0,
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  owner: {
    color: tokenColor('shared'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  play: {
    position: 'absolute',
    right: tokenLength('space-2'),
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface')
  },
  playDisabled: {
    opacity: tokenNumber('opacity-disabled')
  },
  playOn: {
    backgroundColor: tokenColor('accent')
  },
  shuffle: {
    position: 'absolute',
    left: tokenLength('space-2'),
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('surface')
  },
  shuffleOn: {
    borderColor: tokenColor('accent')
  },
  actions: {
    position: 'absolute',
    top: tokenLength('space-2'),
    right: tokenLength('space-2'),
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('surface')
  }
});
