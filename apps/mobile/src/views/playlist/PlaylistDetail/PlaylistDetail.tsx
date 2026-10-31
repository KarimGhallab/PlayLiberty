import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets
} from 'react-native-safe-area-context';

import type { PlaylistTrack } from '@playliberty/contracts';
import { PlaylistSyncStatus, SyncRunStatus } from '@playliberty/contracts';
import { formatDuration, problemDetail, useI18n } from '@playliberty/i18n';

import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import { canWritePlaylist } from '../../../shared/playlistAccess/canWritePlaylist';
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
import { useLatestSyncRun } from '../../../api/useLatestSyncRun';
import { usePlaylist } from '../../../api/usePlaylist';
import { usePlaylistTracks } from '../../../api/usePlaylistTracks';
import { useSyncPlaylist } from '../../../api/useSyncPlaylist';
import type { ApiConfig } from '../../../auth/useApiConfig';
import PlaylistEmpty from '../PlaylistEmpty/PlaylistEmpty';
import PlaylistIdentity from '../PlaylistIdentity/PlaylistIdentity';
import PlaylistNotFound from '../PlaylistNotFound/PlaylistNotFound';
import TrackListSkeleton from '../TrackListSkeleton/TrackListSkeleton';

export interface PlaylistDetailProps {
  readonly playlistId: string | null;
  readonly config: ApiConfig | null;
  readonly onBack: () => void;
  readonly now?: Date;
}

/* The detail's read surface. The identity block and the rows are one scroll, so
 * the cover leaves the screen as the list is walked. Each read outcome owns one
 * body; a failed read is never an empty list. */
export default function PlaylistDetail({
  playlistId,
  config,
  onBack,
  now
}: PlaylistDetailProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const playlist = usePlaylist(playlistId);
  const tracks = usePlaylistTracks(playlistId);
  const latestRun = useLatestSyncRun(playlistId);
  const directory = useAccountDirectory();
  const sync = useSyncPlaylist();
  const playlistFailure =
    problemDetail(
      t,
      playlist.error instanceof ApiError ? playlist.error.problem : null
    ) ?? t('detail.readFailed');
  const tracksFailure =
    problemDetail(
      t,
      tracks.error instanceof ApiError ? tracks.error.problem : null
    ) ?? t('detail.readFailed');

  if (playlist.isPending) {
    return (
      <SafeAreaView
        testID="playlist-screen"
        style={styles.screen}
        edges={['top', 'left', 'right']}>
        <View style={styles.stateBody}>
          <TrackListSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (playlist.isError) {
    const notFound =
      playlist.error instanceof ApiError && playlist.error.status === 404;

    return (
      <SafeAreaView
        testID="playlist-screen"
        style={styles.screen}
        edges={['top', 'left', 'right']}>
        <View style={styles.stateBody}>
          {notFound ? (
            <PlaylistNotFound onBack={onBack} />
          ) : (
            <ReadFailure
              message={playlistFailure}
              retrying={playlist.isFetching}
              onRetry={() => {
                void playlist.refetch();
              }}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const data = playlist.data;
  const ownerName = ownerNameFrom(directory.data ?? [], data.ownerAccountId);
  const syncing =
    latestRun.data?.status === SyncRunStatus.Running &&
    (data.syncStatus === PlaylistSyncStatus.Idle ||
      data.syncStatus === PlaylistSyncStatus.Syncing);
  const syncInFlight =
    sync.isPending || syncing || data.syncStatus === PlaylistSyncStatus.Syncing;

  return (
    <SafeAreaView
      testID="playlist-screen"
      style={styles.screen}
      edges={['top', 'left', 'right']}>
      <ScrollView
        testID="playlist-scroll"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + tokenLength('space-4') }
        ]}>
        <PlaylistIdentity
          playlist={data}
          ownerName={ownerName}
          config={config}
          syncing={syncing}
          now={now}
        />
        {tracks.isPending ? <TrackListSkeleton /> : null}
        {tracks.isError ? (
          <View style={styles.tracksState}>
            <ReadFailure
              message={tracksFailure}
              retrying={tracks.isFetching}
              onRetry={() => {
                void tracks.refetch();
              }}
            />
          </View>
        ) : null}
        {tracks.isSuccess && data.trackCount === 0 ? (
          data.lastSyncedAt === null ? (
            <PlaylistEmpty
              onSync={
                canWritePlaylist(data)
                  ? () => {
                      sync.mutate(data.id);
                    }
                  : undefined
              }
              syncing={syncInFlight}
            />
          ) : (
            <Text testID="playlist-no-tracks" style={styles.note}>
              {t('detail.noTracks')}
            </Text>
          )
        ) : null}
        {tracks.isSuccess && data.trackCount > 0
          ? tracks.data.items.map(entry => (
              <TrackRowSummary key={entry.track.id} entry={entry} />
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TrackRowSummary({ entry }: { readonly entry: PlaylistTrack }) {
  return (
    <View testID="track-row" style={styles.row}>
      <Text numberOfLines={1} style={styles.rowTitle}>
        {entry.track.title}
      </Text>
      {entry.track.durationSeconds === null ? null : (
        <Text style={styles.rowDuration}>
          {formatDuration(entry.track.durationSeconds)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokenColor('bg')
  },
  content: {
    paddingHorizontal: tokenLength('space-4'),
    paddingTop: tokenLength('space-4'),
    gap: tokenLength('space-3')
  },
  stateBody: {
    flex: 1,
    padding: tokenLength('space-4')
  },
  tracksState: {
    minHeight: tokenLength('space-9') * 4,
    paddingVertical: tokenLength('space-4')
  },
  note: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-md')
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokenLength('space-3'),
    paddingVertical: tokenLength('space-2'),
    borderBottomWidth: 1,
    borderBottomColor: tokenColor('line')
  },
  rowTitle: {
    flexShrink: 1,
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md')
  },
  rowDuration: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontVariant: ['tabular-nums']
  }
});
