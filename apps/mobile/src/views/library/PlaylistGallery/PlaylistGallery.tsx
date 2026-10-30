import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaylistSyncStatus, TrackFileStatus } from '@playliberty/contracts';
import type {
  PlaylistWithCounts,
  TrackFileStatusCounts
} from '@playliberty/contracts';
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
import { useCreatePlaylist } from '../../../api/useCreatePlaylist';
import { usePlaylists } from '../../../api/usePlaylists';
import type { ApiConfig } from '../../../auth/useApiConfig';
import AddPlaylistSheet from '../AddPlaylistSheet/AddPlaylistSheet';
import EmptyGallery from '../EmptyGallery/EmptyGallery';
import GalleryAddAction, {
  galleryAddActionSize
} from '../GalleryAddAction/GalleryAddAction';
import GalleryFilterBar from '../GalleryFilterBar/GalleryFilterBar';
import type { LibraryScope } from '../GalleryFilterBar/GalleryFilterBar';
import GallerySkeleton from '../GallerySkeleton/GallerySkeleton';
import PlaylistCard from '../PlaylistCard/PlaylistCard';

const TRACK_STATUSES: readonly TrackFileStatus[] =
  Object.values(TrackFileStatus);

/* The chips read the scope they are drawn over: one total per status over every
 * playlist in that scope. */
function totalStatusCounts(
  items: readonly PlaylistWithCounts[]
): TrackFileStatusCounts {
  const totals: TrackFileStatusCounts = {
    [TrackFileStatus.Stored]: 0,
    [TrackFileStatus.Pending]: 0,
    [TrackFileStatus.Downloading]: 0,
    [TrackFileStatus.Failed]: 0,
    [TrackFileStatus.Unavailable]: 0
  };

  for (const item of items) {
    for (const status of TRACK_STATUSES) {
      totals[status] += item.counts[status];
    }
  }

  return totals;
}

export interface PlaylistGalleryProps {
  readonly config: ApiConfig | null;
  readonly onOpenPlaylist: (playlistId: string) => void;
}

/* The gallery's groups keep the server's order: a pin outranks a running first
 * sync, so the transient group holds the unpinned rows only. */
export default function PlaylistGallery({
  config,
  onOpenPlaylist
}: PlaylistGalleryProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const playlists = usePlaylists();
  const directory = useAccountDirectory();
  const create = useCreatePlaylist();
  const [addOpen, setAddOpen] = useState(false);
  const [scope, setScope] = useState<LibraryScope>('all');
  const [statusFilter, setStatusFilter] = useState<TrackFileStatus | null>(
    null
  );
  const items = playlists.data?.items ?? [];
  const directoryItems = directory.data ?? [];
  const sharedItems = items.filter(item => item.access !== 'owner');
  const hasShared = sharedItems.length > 0;
  const scopedItems = scope === 'shared' ? sharedItems : items;
  const statusCounts = totalStatusCounts(scopedItems);
  const activeCount = statusFilter === null ? 0 : statusCounts[statusFilter];
  const visibleItems =
    statusFilter === null
      ? scopedItems
      : scopedItems.filter(item => item.counts[statusFilter] > 0);

  /* A status the scope no longer carries cannot stay in force; a live read that
   * drops the last track in it returns the rail to All. */
  useEffect(() => {
    if (statusFilter !== null && activeCount === 0) {
      setStatusFilter(null);
    }
  }, [statusFilter, activeCount]);

  /* The scope cannot outlive the last share: its pair leaves the rail. */
  useEffect(() => {
    if (scope === 'shared' && !hasShared) {
      setScope('all');
    }
  }, [scope, hasShared]);

  const pinned = visibleItems.filter(item => item.pinned);
  const unpinned = visibleItems.filter(item => !item.pinned);
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
  const createProblem = problemDetail(
    t,
    create.error instanceof ApiError ? create.error.problem : null
  );

  /* The server accepts the link by starting the sync, so the sheet closes and
   * the gallery reads again; the new row arrives already syncing. */
  useEffect(() => {
    if (create.isSuccess) {
      setAddOpen(false);
      create.reset();
    }
  }, [create.isSuccess, create.reset]);

  const addSheet = (
    <AddPlaylistSheet
      visible={addOpen}
      busy={create.isPending}
      problem={createProblem}
      onSubmit={(url, skipNonMusic) => {
        create.mutate({ url, skipNonMusic });
      }}
      onClose={() => {
        setAddOpen(false);
        create.reset();
      }}
    />
  );

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
      <>
        <View
          style={[
            styles.state,
            { paddingBottom: insets.bottom + tokenLength('space-4') }
          ]}>
          <EmptyGallery onAdd={() => setAddOpen(true)} />
        </View>
        {addSheet}
      </>
    );
  }

  return (
    <View style={styles.list}>
      <GalleryFilterBar
        hasShared={hasShared}
        totalCount={items.length}
        sharedCount={sharedItems.length}
        scope={scope}
        onScopeChange={setScope}
        counts={statusCounts}
        activeStatus={statusFilter}
        onStatusChange={setStatusFilter}
      />
      <ScrollView
        style={styles.gallery}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom +
              tokenLength('space-4') +
              galleryAddActionSize +
              tokenLength('space-3')
          }
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
      <GalleryAddAction
        label={t('library.add')}
        onPress={() => setAddOpen(true)}
      />
      {addSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    flex: 1
  },
  list: {
    flex: 1,
    gap: tokenLength('space-3')
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
