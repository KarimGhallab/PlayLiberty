import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets
} from 'react-native-safe-area-context';

import type { PlaylistTrack } from '@playliberty/contracts';
import { PlaylistSyncStatus, SyncRunStatus } from '@playliberty/contracts';
import { formatDuration } from '@playliberty/i18n';

import {
  fontFamily,
  tokenColor,
  tokenLength
} from '../../../shared/styles/tokens';

import {
  ownerNameFrom,
  useAccountDirectory
} from '../../../api/useAccountDirectory';
import { useLatestSyncRun } from '../../../api/useLatestSyncRun';
import { usePlaylist } from '../../../api/usePlaylist';
import { usePlaylistTracks } from '../../../api/usePlaylistTracks';
import type { ApiConfig } from '../../../auth/useApiConfig';
import PlaylistIdentity from '../PlaylistIdentity/PlaylistIdentity';

export interface PlaylistDetailProps {
  readonly playlistId: string | null;
  readonly config: ApiConfig | null;
  readonly now?: Date;
}

/* The detail's read surface. The identity block and the rows are one scroll, so
 * the cover leaves the screen as the list is walked. */
export default function PlaylistDetail({
  playlistId,
  config,
  now
}: PlaylistDetailProps) {
  const insets = useSafeAreaInsets();
  const playlist = usePlaylist(playlistId);
  const tracks = usePlaylistTracks(playlistId);
  const latestRun = useLatestSyncRun(playlistId);
  const directory = useAccountDirectory();

  if (!playlist.isSuccess) {
    return (
      <SafeAreaView
        testID="playlist-screen"
        style={styles.screen}
        edges={['top', 'left', 'right']}
      />
    );
  }

  const data = playlist.data;
  const ownerName = ownerNameFrom(directory.data ?? [], data.ownerAccountId);
  const syncing =
    latestRun.data?.status === SyncRunStatus.Running &&
    (data.syncStatus === PlaylistSyncStatus.Idle ||
      data.syncStatus === PlaylistSyncStatus.Syncing);

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
        {tracks.data?.items.map(entry => (
          <TrackRowSummary key={entry.track.id} entry={entry} />
        ))}
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
