import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets
} from 'react-native-safe-area-context';

import type { PlaylistTrack } from '@playliberty/contracts';
import { PlaylistSyncStatus, SyncRunStatus } from '@playliberty/contracts';
import { problemDetail, useI18n } from '@playliberty/i18n';

import { copyText } from '../../../shared/clipboard/copyText';
import Notice from '../../../shared/components/Notice/Notice';
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
import { useFetchTrackWhole } from '../../../api/useFetchTrackWhole';
import { useLatestSyncRun } from '../../../api/useLatestSyncRun';
import { usePlaylist } from '../../../api/usePlaylist';
import { usePlaylistQueue } from '../../../api/usePlaylistQueue';
import { usePlaylistTracks } from '../../../api/usePlaylistTracks';
import { useRetryTrack } from '../../../api/useRetryTrack';
import { useSyncPlaylist } from '../../../api/useSyncPlaylist';
import type { ApiConfig } from '../../../auth/useApiConfig';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import PlaylistEmpty from '../PlaylistEmpty/PlaylistEmpty';
import PlaylistIdentity from '../PlaylistIdentity/PlaylistIdentity';
import PlaylistNotFound from '../PlaylistNotFound/PlaylistNotFound';
import TrackActionsSheet from '../TrackActionsSheet/TrackActionsSheet';
import {
  type TrackActionKey,
  trackActionsFor
} from '../TrackActionsSheet/trackActions/trackActions';
import TrackListSkeleton from '../TrackListSkeleton/TrackListSkeleton';
import TrackRow from '../TrackRow/TrackRow';

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
  const queue = usePlaylistQueue(playlistId, playlist.isSuccess);
  const latestRun = useLatestSyncRun(playlistId);
  const directory = useAccountDirectory();
  const sync = useSyncPlaylist();
  const retry = useRetryTrack(playlistId ?? '');
  const fetchWhole = useFetchTrackWhole(playlistId ?? '');
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    readonly message: string;
    readonly detail: string;
  } | null>(null);
  const currentId = usePlayerStore(state => state.currentId);
  const start = usePlayerStore(state => state.start);
  const busyTrackId = retry.isPending
    ? retry.variables
    : fetchWhole.isPending
      ? fetchWhole.variables
      : undefined;
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

  /* The queue is the playlist's playable order, so a press on any row starts
   * the same queue at that row rather than a queue built from the loaded page. */
  const playTrack = useCallback(
    (trackId: string): void => {
      const items = queue.data?.items ?? [];

      if (
        playlistId === null ||
        !items.some(entry => entry.track.id === trackId)
      ) {
        return;
      }

      start(
        items.map(entry => entry.track.id),
        playlistId,
        trackId
      );
    },
    [playlistId, queue.data, start]
  );
  const openActions = useCallback((trackId: string): void => {
    setActionTargetId(trackId);
  }, []);

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
  const actionTarget =
    actionTargetId === null
      ? null
      : (tracks.data?.items.find(entry => entry.track.id === actionTargetId) ??
        null);
  const actions =
    actionTarget === null
      ? []
      : trackActionsFor(
          actionTarget.track,
          canWritePlaylist(data),
          data.skipNonMusic,
          busyTrackId === actionTarget.track.id
        );

  const actionFailure = (error: Error): string =>
    problemDetail(t, error instanceof ApiError ? error.problem : null) ??
    t('trackRow.failure.unknown');

  const copyTrackLink = (target: PlaylistTrack): void => {
    if (config === null) {
      setNotice({
        message: t('trackRow.linkCopyFailed'),
        detail: target.track.title
      });
      return;
    }

    const origin = config.baseUrl.replace(/\/+$/, '');
    const url = `${origin}/playlists/${encodeURIComponent(
      data.id
    )}?track=${encodeURIComponent(target.track.id)}`;

    void copyText(url)
      .then(copied => {
        setNotice({
          message: copied
            ? t('trackRow.linkCopied')
            : t('trackRow.linkCopyFailed'),
          detail: target.track.title
        });
      })
      .catch(() => {
        setNotice({
          message: t('trackRow.linkCopyFailed'),
          detail: target.track.title
        });
      });
  };

  const chooseTrackAction = (key: TrackActionKey): void => {
    const target = actionTarget;
    setActionTargetId(null);

    if (target === null) {
      return;
    }

    if (key === 'copy') {
      copyTrackLink(target);
      return;
    }

    if (key === 'retry') {
      retry.mutate(target.track.id, {
        onError: error => {
          setNotice({
            message: actionFailure(error),
            detail: target.track.title
          });
        }
      });
      return;
    }

    fetchWhole.mutate(target.track.id, {
      onError: error => {
        setNotice({
          message: actionFailure(error),
          detail: target.track.title
        });
      }
    });
  };

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
              <TrackRow
                key={entry.track.id}
                association={entry}
                config={config}
                current={currentId === entry.track.id}
                onOpenActions={openActions}
                onPlay={playTrack}
              />
            ))
          : null}
      </ScrollView>
      <TrackActionsSheet
        trackTitle={actionTarget?.track.title ?? null}
        actions={actions}
        onSelect={chooseTrackAction}
        onClose={() => setActionTargetId(null)}
      />
      {notice === null ? null : (
        <Notice
          message={notice.message}
          detail={notice.detail}
          onDismiss={() => setNotice(null)}
        />
      )}
    </SafeAreaView>
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
  }
});
