import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaylistSyncStatus } from '@playliberty/contracts';
import { problemDetail, useI18n } from '@playliberty/i18n';

import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import {
  fontFamily,
  tokenColor,
  tokenLength
} from '../../../shared/styles/tokens';

import { ApiError } from '../../../api/apiClient/ApiClient';
import {
  ownerNameFrom,
  useAccountDirectory
} from '../../../api/useAccountDirectory';
import { usePlaylists } from '../../../api/usePlaylists';
import type { ApiConfig } from '../../../auth/useApiConfig';
import EmptyGallery from '../EmptyGallery/EmptyGallery';
import GallerySkeleton from '../GallerySkeleton/GallerySkeleton';
import PlaylistCard from '../PlaylistCard/PlaylistCard';

export interface PlaylistGalleryProps {
  readonly config: ApiConfig | null;
  readonly onAddPlaylist: () => void;
  readonly onOpenPlaylist: (playlistId: string) => void;
}

/* The gallery's groups keep the server's order: a pin outranks a running first
 * sync, so the transient group holds the unpinned rows only. */
export default function PlaylistGallery({
  config,
  onAddPlaylist,
  onOpenPlaylist
}: PlaylistGalleryProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const playlists = usePlaylists();
  const directory = useAccountDirectory();
  const items = playlists.data?.items ?? [];
  const directoryItems = directory.data ?? [];
  const pinned = items.filter(item => item.pinned);
  const unpinned = items.filter(item => !item.pinned);
  const syncing = unpinned.filter(
    item => item.syncStatus === PlaylistSyncStatus.Syncing
  );
  const rest = unpinned.filter(
    item => item.syncStatus !== PlaylistSyncStatus.Syncing
  );
  const groups = [
    { key: 'pinned', heading: t('library.pinned'), items: pinned },
    { key: 'syncing', heading: t('library.syncing'), items: syncing },
    { key: 'rest', heading: null, items: rest }
  ].filter(group => group.items.length > 0);
  const failureMessage =
    problemDetail(
      t,
      playlists.error instanceof ApiError ? playlists.error.problem : null
    ) ?? t('library.readFailed');

  if (playlists.isPending) {
    return (
      <View
        style={[
          styles.state,
          { paddingBottom: insets.bottom + tokenLength('space-4') }
        ]}>
        <GallerySkeleton />
      </View>
    );
  }

  if (playlists.isError) {
    return (
      <View
        style={[
          styles.state,
          { paddingBottom: insets.bottom + tokenLength('space-4') }
        ]}>
        <ReadFailure
          message={failureMessage}
          retrying={playlists.isFetching}
          onRetry={() => {
            void playlists.refetch();
          }}
        />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View
        style={[
          styles.state,
          { paddingBottom: insets.bottom + tokenLength('space-4') }
        ]}>
        <EmptyGallery onAdd={onAddPlaylist} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.gallery}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + tokenLength('space-4') }
      ]}>
      {groups.map(group => (
        <View key={group.key} style={styles.group}>
          {group.heading === null ? null : (
            <Text accessibilityRole="header" style={styles.heading}>
              {group.heading}
            </Text>
          )}
          <View style={styles.grid}>
            {group.items.map(playlist => (
              <View key={playlist.id} style={styles.cell}>
                <PlaylistCard
                  playlist={playlist}
                  ownerName={ownerNameFrom(
                    directoryItems,
                    playlist.ownerAccountId
                  )}
                  config={config}
                  onOpen={() => onOpenPlaylist(playlist.id)}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  state: {
    flex: 1
  },
  gallery: {
    flex: 1
  },
  content: {
    gap: tokenLength('space-4')
  },
  group: {
    gap: tokenLength('space-2')
  },
  heading: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: '600'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokenLength('space-3')
  },
  cell: {
    width: '48%'
  }
});
