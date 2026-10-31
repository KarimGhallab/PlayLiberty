import {
  IconDots,
  IconDownload,
  IconPlayerPlay
} from '@tabler/icons-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PlaylistWithCounts } from '@playliberty/contracts';
import { TrackFileStatus } from '@playliberty/contracts';
import { syncStateLabel, trackCountUnit, useI18n } from '@playliberty/i18n';

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
  touchTarget
} from '../../../shared/styles/tokens';

import type { ApiConfig } from '../../../auth/useApiConfig';

export interface PlaylistCardProps {
  readonly playlist: PlaylistWithCounts;
  readonly ownerName: string | null;
  readonly config: ApiConfig | null;
  readonly onOpen: () => void;
  readonly onOpenActions: () => void;
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
 * The play waits for spec 23, so it is drawn and disabled. */
export default function PlaylistCard({
  playlist,
  ownerName,
  config,
  onOpen,
  onOpenActions,
  actionsTestID
}: PlaylistCardProps) {
  const { t } = useI18n();
  const cover = usePlaylistCover(playlist, config);
  const mark = shareMark(playlist);
  const incomplete = incompleteOf(playlist.counts);
  const sharedBy = playlist.access === 'owner' ? null : ownerName;
  const [width, setWidth] = useState(0);
  const shareColor = shareMarkColor(mark);
  const playTop = Math.max(0, width - touchTarget - tokenLength('space-2'));

  return (
    <View
      style={styles.card}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}>
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
          <View style={styles.scrim} />
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
            <Text style={styles.count}>
              {playlist.trackCount} {trackCountUnit(t, playlist.trackCount)}
            </Text>
            {incomplete === null ? null : (
              <View testID="playlist-incomplete" style={styles.incomplete}>
                <IconDownload
                  size={tokenLength('icon-sm')}
                  color={tokenColor(TONE_COLORS[incomplete.tone])}
                />
                <Text
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
            style={[
              styles.state,
              { color: syncStateColor(playlist.syncStatus) }
            ]}>
            {syncStateLabel(t, playlist.syncStatus)}
          </Text>
        </View>

        {sharedBy === null ? null : (
          <Text numberOfLines={1} style={styles.owner}>
            {t('header.sharedBy', { name: sharedBy })}
          </Text>
        )}
      </View>

      <Pressable
        testID="playlist-card"
        accessibilityRole="button"
        accessibilityLabel={playlist.name}
        style={StyleSheet.absoluteFill}
        android_ripple={{ color: tokenColor('control-border') }}
        onPress={onOpen}
      />

      <Pressable
        testID="playlist-play"
        accessibilityRole="button"
        accessibilityLabel={t('header.playNamed', { name: playlist.name })}
        accessibilityState={{ disabled: true }}
        disabled
        style={[styles.play, { top: playTop }, styles.playDisabled]}>
        <IconPlayerPlay
          size={tokenLength('icon-md')}
          color={tokenColor('ink')}
        />
      </Pressable>

      <Pressable
        testID={actionsTestID ?? 'playlist-actions'}
        accessibilityRole="button"
        accessibilityLabel={t('header.actions', { name: playlist.name })}
        style={[styles.actions, { top: playTop }]}
        onPress={onOpenActions}>
        <IconDots size={tokenLength('icon-md')} color={tokenColor('ink')} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    gap: tokenLength('space-2')
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
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '35%',
    backgroundColor: tokenColor('scrim')
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
    fontWeight: '600'
  },
  meta: {
    flexDirection: 'row',
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
    left: tokenLength('space-2'),
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
  actions: {
    position: 'absolute',
    right: tokenLength('space-2'),
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface')
  }
});
