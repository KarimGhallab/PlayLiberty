import {
  IconArrowsShuffle,
  IconDots,
  IconPlayerPlay
} from '@tabler/icons-react-native';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Playlist } from '@playliberty/contracts';
import { PlaylistSyncStatus } from '@playliberty/contracts';
import {
  formatLastSynced,
  syncStateLabel,
  trackCountUnit,
  useI18n
} from '@playliberty/i18n';

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

const COVER_SIZE = 96;
const PLAY_SIZE = 48;

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
  readonly children?: ReactNode;
}

/* The detail's hero: the cover, the name, the share mark, the count, the sync
 * line and the two start controls. The controls wait for their callbacks. */
export default function PlaylistIdentity({
  playlist,
  ownerName,
  config,
  syncing = false,
  now = new Date(),
  onPlay,
  onShuffle,
  onOpenActions,
  children
}: PlaylistIdentityProps) {
  const { t } = useI18n();
  const cover = usePlaylistCover(playlist, config);
  const mark = shareMark(playlist);
  const markColor = shareMarkColor(mark);
  const status = syncing ? PlaylistSyncStatus.Syncing : playlist.syncStatus;
  const lastSyncedAt =
    playlist.lastSyncedAt === null ? null : new Date(playlist.lastSyncedAt);
  const sharedBy =
    playlist.access !== 'owner' && ownerName !== null ? ownerName : null;

  return (
    <View testID="playlist-identity" style={styles.identity}>
      <View style={styles.row}>
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

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              testID="playlist-name"
              style={styles.name}>
              {playlist.name}
            </Text>
            <View
              testID="playlist-share"
              accessible
              accessibilityRole="image"
              accessibilityLabel={t(mark.label)}>
              <mark.Icon size={tokenLength('icon-sm')} color={markColor} />
            </View>
          </View>

          <View style={styles.meta}>
            <Text
              testID="playlist-sync-state"
              style={[styles.state, { color: syncStateColor(status) }]}>
              {syncStateLabel(t, status)}
            </Text>
            <Text
              accessible={false}
              importantForAccessibility="no"
              style={styles.separator}>
              &middot;
            </Text>
            <Text testID="playlist-last-synced" style={styles.time}>
              {formatLastSynced(t, lastSyncedAt, now)}
            </Text>
          </View>

          <Text testID="playlist-track-count" style={styles.count}>
            {playlist.trackCount} {trackCountUnit(t, playlist.trackCount)}
          </Text>

          {sharedBy === null ? null : (
            <Text testID="playlist-owner" style={styles.owner}>
              {t('header.sharedBy', { name: sharedBy })}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            testID="detail-play"
            accessibilityRole="button"
            accessibilityLabel={t('header.play')}
            accessibilityState={{ disabled: onPlay === undefined }}
            disabled={onPlay === undefined}
            style={({ pressed }) => [
              styles.play,
              onPlay === undefined && styles.disabled,
              pressed && onPlay !== undefined && styles.playPressed
            ]}
            onPress={onPlay}>
            <IconPlayerPlay
              size={tokenLength('icon-md')}
              color={tokenColor('bg')}
            />
          </Pressable>
          <View style={styles.secondary}>
            <Pressable
              testID="detail-shuffle"
              accessibilityRole="button"
              accessibilityLabel={t('header.shuffle', {
                name: playlist.name
              })}
              accessibilityState={{ disabled: onShuffle === undefined }}
              disabled={onShuffle === undefined}
              style={({ pressed }) => [
                styles.shuffle,
                onShuffle === undefined && styles.disabled,
                pressed && onShuffle !== undefined && styles.shufflePressed
              ]}
              onPress={onShuffle}>
              <IconArrowsShuffle
                size={tokenLength('icon-md')}
                color={tokenColor('muted')}
              />
            </Pressable>
            {onOpenActions === undefined ? null : (
              <Pressable
                testID="detail-actions"
                accessibilityRole="button"
                accessibilityLabel={t('header.actions', {
                  name: playlist.name
                })}
                style={({ pressed }) => [
                  styles.shuffle,
                  pressed && styles.shufflePressed
                ]}
                onPress={onOpenActions}>
                <IconDots
                  size={tokenLength('icon-md')}
                  color={tokenColor('muted')}
                />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {
    gap: tokenLength('space-3')
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3')
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: tokenLength('radius-card'),
    overflow: 'hidden'
  },
  image: {
    width: '100%',
    height: '100%'
  },
  body: {
    flex: 1,
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
    fontSize: tokenLength('text-lg'),
    fontWeight: '600',
    lineHeight: tokenLength('text-lg') * tokenNumber('leading-tight')
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokenLength('space-1')
  },
  state: {
    fontFamily,
    fontSize: tokenLength('text-xs'),
    fontWeight: '600'
  },
  separator: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  time: {
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
  actions: {
    alignItems: 'center',
    gap: tokenLength('space-2')
  },
  secondary: {
    flexDirection: 'row',
    gap: tokenLength('space-2')
  },
  play: {
    width: PLAY_SIZE,
    height: PLAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PLAY_SIZE / 2,
    backgroundColor: tokenColor('accent')
  },
  playPressed: {
    backgroundColor: tokenColor('accent-hover')
  },
  shuffle: {
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control')
  },
  shufflePressed: {
    backgroundColor: tokenColor('surface-raised')
  },
  disabled: {
    opacity: tokenNumber('opacity-disabled')
  }
});
