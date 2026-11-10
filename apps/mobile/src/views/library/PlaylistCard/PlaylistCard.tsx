import {
  IconArrowsShuffle,
  IconDots,
  IconDownload
} from '@tabler/icons-react-native';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { PlaylistWithCounts } from '@playliberty/contracts';
import { TrackFileStatus } from '@playliberty/contracts';
import { syncStateLabel, trackCountUnit, useI18n } from '@playliberty/i18n';

import AppImage from '../../../shared/components/AppImage';
import PlayPauseGlyph, {
  type PlayPauseGlyphHandle
} from '../../../shared/components/PlayPauseGlyph';
import PlayingLine from '../../../shared/components/PlayingLine';
import PressableScale from '../../../shared/components/PressableScale/PressableScale';
import Spinner from '../../../shared/components/Spinner';
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
} from '../../../shared/styles/tokens/tokens';
import { usePlaylistCover } from '../../../shared/usePlaylistCover';

import type { ApiConfig } from '../../../auth/useApiConfig/useApiConfig';

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

type ShortfallState =
  | TrackFileStatus.Pending
  | TrackFileStatus.Downloading
  | TrackFileStatus.Failed;

/* A shortfall is work the product can still do. A track whose video was gone
 * before storage is not work, it is a closed fact. */
const MISSING: readonly ShortfallState[] = [
  TrackFileStatus.Pending,
  TrackFileStatus.Downloading,
  TrackFileStatus.Failed
];

/* Worst wins, because a break is louder news than a wait. */
const SEVERITY: readonly ShortfallState[] = [
  TrackFileStatus.Failed,
  TrackFileStatus.Downloading,
  TrackFileStatus.Pending
];

/* The card's cell is fixed, so its meta stops scaling before the row collides. */
const MAX_CARD_SCALE = 1.3;

const TONE_COLORS: Record<
  ShortfallState,
  'tone-pending' | 'tone-downloading' | 'tone-failed'
> = {
  [TrackFileStatus.Pending]: 'tone-pending',
  [TrackFileStatus.Downloading]: 'tone-downloading',
  [TrackFileStatus.Failed]: 'tone-failed'
};

interface Incomplete {
  /* Work that can still finish. */
  readonly missing: number;
  /* Tracks whose video was already gone; terminal, never a download. */
  readonly gone: number;
  readonly tone: ShortfallState | null;
}

function incompleteOf(counts: PlaylistWithCounts['counts']): Incomplete | null {
  const missing = MISSING.reduce((sum, state) => sum + counts[state], 0);
  const gone = counts[TrackFileStatus.Unavailable];

  if (missing === 0 && gone === 0) {
    return null;
  }

  const tone =
    missing === 0
      ? null
      : (SEVERITY.find(state => counts[state] > 0) ?? TrackFileStatus.Pending);

  return { missing, gone, tone };
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
  const glyph = useRef<PlayPauseGlyphHandle>(null);
  const cover = usePlaylistCover(playlist, config);
  const mark = shareMark(playlist);
  const incomplete = incompleteOf(playlist.counts);
  const sharedBy = playlist.access === 'owner' ? null : ownerName;
  /* The card is one target, so its name carries what the parts say: mark,
   * count, unstored tracks, sync state and owner. */
  const cardLabel = [
    playlist.name,
    t(mark.label),
    `${playlist.trackCount} ${trackCountUnit(t, playlist.trackCount)}`,
    incomplete === null || incomplete.missing === 0
      ? null
      : t('library.notDownloaded', { count: incomplete.missing }),
    incomplete === null || incomplete.gone === 0
      ? null
      : t('library.neverStored', { count: incomplete.gone }),
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
  const actions = [
    playDisabled
      ? null
      : {
          name: 'play',
          label: t(playing ? 'header.pauseNamed' : 'header.playNamed', {
            name: playlist.name
          })
        },
    shuffleDisabled
      ? null
      : {
          name: 'shuffle',
          label: t('header.shuffle', { name: playlist.name })
        },
    { name: 'openActions', label: t('header.actions', { name: playlist.name }) }
  ].filter(
    (action): action is { name: string; label: string } => action !== null
  );

  return (
    <PressableScale
      testID="playlist-card"
      accessibilityRole="button"
      accessibilityLabel={cardLabel}
      accessibilityActions={actions}
      onAccessibilityAction={event => {
        const chosen = event.nativeEvent.actionName;

        if (chosen === 'play' && !playDisabled) {
          glyph.current?.morphTo(!playing);
          onPlay();
        }

        if (chosen === 'shuffle' && !shuffleDisabled) {
          onShuffle();
        }

        if (chosen === 'openActions') {
          onOpenActions();
        }
      }}
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
            <AppImage
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
          {incomplete === null || incomplete.tone === null ? null : (
            <View testID="playlist-incomplete" style={styles.incomplete}>
              <IconDownload
                size={tokenLength('icon-sm')}
                color={tokenColor(TONE_COLORS[incomplete.tone])}
              />
              <Text
                numberOfLines={2}
                maxFontSizeMultiplier={MAX_CARD_SCALE}
                style={[
                  styles.incompleteCount,
                  { color: tokenColor(TONE_COLORS[incomplete.tone]) }
                ]}>
                {t('library.notDownloaded', { count: incomplete.missing })}
              </Text>
            </View>
          )}
          {incomplete === null || incomplete.gone === 0 ? null : (
            <Text
              testID="playlist-gone"
              numberOfLines={2}
              maxFontSizeMultiplier={MAX_CARD_SCALE}
              style={styles.gone}>
              {t('library.neverStored', { count: incomplete.gone })}
            </Text>
          )}
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

      {/* The controls are drawn over the cover and hidden from the tree, so
        the card carries one stop per playlist. */}
      <PressableScale
        testID="playlist-play"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        disabled={playDisabled}
        style={[
          styles.play,
          { top: playTop },
          playing && !playDisabled && styles.playOn,
          playDisabled && styles.playDisabled
        ]}
        onPress={() => {
          glyph.current?.morphTo(!playing);
          onPlay();
        }}>
        {starting === 'play' ? (
          <Spinner color={tokenColor(playing ? 'bg' : 'muted')} />
        ) : (
          <PlayPauseGlyph
            ref={glyph}
            playing={playing}
            size={tokenLength('icon-md')}
            color={tokenColor(playing ? 'bg' : 'ink')}
          />
        )}
      </PressableScale>

      <PressableScale
        testID="playlist-shuffle"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        disabled={shuffleDisabled}
        style={[styles.shuffleSlot, { top: playTop }]}
        onPress={onShuffle}>
        <View
          style={[
            styles.disc,
            shuffled && !shuffleDisabled && styles.discOn,
            shuffleDisabled && styles.playDisabled
          ]}>
          {starting === 'shuffle' ? (
            <Spinner color={tokenColor('muted-on-art')} />
          ) : (
            <IconArrowsShuffle
              size={tokenLength('icon-md')}
              color={tokenColor(shuffled ? 'accent-on-art' : 'muted-on-art')}
            />
          )}
        </View>
      </PressableScale>

      <PressableScale
        testID={actionsTestID ?? 'playlist-actions'}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.actionsSlot, { top: tokenLength('space-2') }]}
        onPress={onOpenActions}>
        <View style={styles.disc}>
          <IconDots
            size={tokenLength('icon-md')}
            color={tokenColor('muted-on-art')}
          />
        </View>
      </PressableScale>

      <PlayingLine playing={playing} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    /* The gallery's cell is as tall as its row, so the card fills it; a card
     * with a shorter identity keeps the row's floor rather than ending early. */
    flex: 1,
    position: 'relative',
    paddingBottom: tokenLength('space-2')
  },
  content: {
    flex: 1,
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
    gap: tokenLength('space-1')
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokenLength('space-2')
  },
  count: {
    flexShrink: 1,
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  incomplete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-1')
  },
  incompleteCount: {
    flexShrink: 1,
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  gone: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  state: {
    flexShrink: 0,
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  owner: {
    /* The optional owner line sits on the card's floor, so two cards in a row
     * put their shared banners on the same baseline. */
    marginTop: 'auto',
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
  shuffleSlot: {
    position: 'absolute',
    left: tokenLength('space-2'),
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionsSlot: {
    position: 'absolute',
    right: tokenLength('space-2'),
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center'
  },
  disc: {
    width: tokenLength('space-8'),
    height: tokenLength('space-8'),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokenColor('line'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('scrim')
  },
  discOn: {
    borderColor: tokenColor('accent-on-art')
  }
});
