import { IconChevronLeft } from '@tabler/icons-react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';

import { PlaylistSyncStatus, TrackFileStatus } from '@playliberty/contracts';

import { ApiError } from '../../shared/api/client';
import {
  ownerNameFrom,
  useAccountDirectory,
  useDeletePlaylist,
  useLatestSyncRun,
  usePlaylist,
  usePlaylistTracks,
  useRemoveTrack,
  useRenamePlaylist,
  useRetryTrack,
  useSyncPlaylist
} from '../../shared/api/queries';
import EmptyState from '../../shared/components/EmptyState';
import PlaylistHeader from '../../shared/components/PlaylistHeader';
import PlaylistNotFound from '../../shared/components/PlaylistNotFound';
import RenamePlaylistDialog from '../../shared/components/RenamePlaylistDialog';
import SharePlaylistDialog from '../../shared/components/SharePlaylistDialog';
import SyncError from '../../shared/components/SyncError';
import SyncSummary from '../../shared/components/SyncSummary';
import TrackRow from '../../shared/components/TrackRow';
import UndoToast from '../../shared/components/UndoToast';
import {
  UNDO_WINDOW_MS,
  useDeferredAction
} from '../../shared/components/useDeferredAction';
import { usePlayerStore } from '../../shared/player/playerStore';
import { toPlayerTracks } from '../../shared/player/playerTracks';
import { nextIndex } from '../../shared/player/types';
import { MOBILE_QUERY, useMediaQuery } from '../../shared/useMediaQuery';

import styles from './PlaylistDetailPage.module.scss';

/*
 * The playlist detail, at `/playlists/:id`, and the screen the product exists
 * for: the only place stored tracks become audible. It composes the way home,
 * the playlist header, the sync summary or the sync error, the track list or the
 * empty state, in two columns on the web: the playlist on the left and the
 * tracks on the right, with the player bar docked below by the shell.
 *
 * The left column is the header's card arrangement at 320px, not the row the
 * library draws: the width is this screen's one decision and the component's own
 * card is what fits inside it. Beneath the card sits one state component and
 * never two, the summary when there is a run to summarise and the error when the
 * sync failed. A never-synced playlist has no run, so it has neither, and the
 * empty state in the list area says so on its own.
 *
 * Under 768px it is one column instead of two, and the header is the component's
 * row rather than its card: the design's mobile arrangement, where the card
 * would be 470.4px tall against the row's 136px. The way home is absent there,
 * because the platform gesture returns from the pushed route and a control that
 * returns would do what the platform already does.
 *
 * The list is drawn in the playlist's own order and every association appears,
 * playable or not, because a track that silently vanished from the list would
 * make "why is this track missing" unanswerable. The play control's presence is
 * the server's own file status, which is the same fact `toPlayerTracks` filters
 * on, so the list and the queue agree by construction.
 */
export default function PlaylistDetailPage() {
  const { playlistId } = useParams({ from: '/playlists/$playlistId' });
  const navigate = useNavigate();
  const playlist = usePlaylist(playlistId);
  const tracks = usePlaylistTracks(playlistId);
  const latestRun = useLatestSyncRun(playlistId);
  const directory = useAccountDirectory();
  const sync = useSyncPlaylist(playlistId);
  const remove = useDeletePlaylist(playlistId);
  const retry = useRetryTrack(playlistId);
  const removeTrack = useRemoveTrack(playlistId);
  const rename = useRenamePlaylist(playlistId);
  const [renameOpen, setRenameOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const deferred = useDeferredAction();
  /*
   * The header's arrangement at this width. The design's mobile arrangement is
   * the component's row, not its card: at 390 the card is 470.4px tall and the
   * row is 136px, so the row is the one that fits, and the two are different
   * markup rather than two stylesheets, which is why this asks the viewport
   * rather than branching in CSS.
   */
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const startQueue = usePlayerStore(state => state.startQueue);
  const setPlaying = usePlayerStore(state => state.setPlaying);
  const skipNext = usePlayerStore(state => state.skipNext);
  const skipPrevious = usePlayerStore(state => state.skipPrevious);
  const currentId = usePlayerStore(state => state.currentId);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const shuffled = usePlayerStore(state => state.shuffle);
  const setShuffle = usePlayerStore(state => state.setShuffle);
  const queuePlaylistId = usePlayerStore(
    state => state.queue[0]?.playlistId ?? null
  );
  /*
   * Whether the queue holds a track after the current one, which is what decides
   * if the header's forward step has anywhere to go. Derived from the queue
   * rather than the playlist because the transport acts on the queue, and from
   * the shared next-index rule so a shuffled queue can always move on.
   */
  const hasNext = usePlayerStore(state => nextIndex(state) >= 0);

  const ownerName =
    playlist.data !== undefined && directory.data !== undefined
      ? ownerNameFrom(directory.data, playlist.data.ownerAccountId)
      : null;

  const playTrack = (trackId: string): void => {
    if (trackId === currentId) {
      setPlaying(!isPlaying);
      return;
    }

    if (tracks.data === undefined || playlist.data === undefined) {
      return;
    }

    startQueue(
      playlistId,
      toPlayerTracks(tracks.data, playlistId, playlist.data.name),
      trackId
    );
  };

  /*
   * The header's play is the queue's own door: it builds the whole playlist and
   * starts at the first playable track, which is the same queue a row builds and
   * simply entered from the top. When this playlist is already the queue, it is
   * pause and resume, so the one control keeps the two meanings it has on a row.
   */
  const playPlaylist = (): void => {
    if (queuePlaylistId === playlistId) {
      setPlaying(!isPlaying);
      return;
    }

    if (tracks.data === undefined || playlist.data === undefined) {
      return;
    }

    const playerTracks = toPlayerTracks(
      tracks.data,
      playlistId,
      playlist.data.name
    );
    const first = playerTracks[0];

    if (first === undefined) {
      return;
    }

    startQueue(playlistId, playerTracks, first.id);
  };

  const deletePlaylist = (): void => {
    deferred.defer({
      message: 'Deleting playlist',
      detail: playlist.data?.name ?? null,
      commit: () =>
        remove.mutate(undefined, {
          onSuccess: () => {
            void navigate({ to: '/' });
          }
        })
    });
  };

  /*
   * Removing a track is deferred the same way as deleting the playlist: the call
   * waits out the window, and the toast's Cancel stops it. The track is named
   * because two rows can read alike and the toast is the only place the removal is
   * still reversible.
   */
  const removeTrackDeferred = (trackId: string): void => {
    const title =
      tracks.data?.find(association => association.track.id === trackId)?.track
        .title ?? 'Track';

    deferred.defer({
      message: 'Removing track',
      detail: title,
      commit: () => removeTrack.mutate(trackId)
    });
  };

  const access = playlist.data?.access;
  const canSync = access === 'owner' || access === 'write';
  const canWrite = canSync;
  const retryingTrackId = retry.isPending ? retry.variables : undefined;
  const neverSynced = playlist.data?.lastSyncedAt === null;
  const failed = playlist.data?.syncStatus === PlaylistSyncStatus.Error;
  const isQueue = queuePlaylistId === playlistId;
  const playingThis = isPlaying && isQueue;

  /*
   * The in-flight figure the summary draws is derived from the tracks this
   * client holds, because the contract stores no pending count. It is only
   * meaningful while a run is active, which is the only time the summary reads
   * it.
   */
  const downloadingCount =
    tracks.data?.filter(
      association =>
        association.track.fileStatus === TrackFileStatus.Downloading
    ).length ?? 0;

  /*
   * A playlist query that answers 404, whether because the playlist does not
   * exist or because the account can no longer see it, is the not-found state
   * and not an error: the header for a playlist that is not there, and a list
   * area with an error sentence, both assert something the server denied. The
   * whole two-column body is replaced, and the state owns one action, back to
   * the library.
   */
  if (playlist.isError) {
    return (
      <main className={styles.playlistDetail}>
        <PlaylistNotFound />
      </main>
    );
  }

  return (
    <main className={styles.playlistDetail}>
      <nav className={styles.playlistDetail__wayhome}>
        <Link to="/" className={styles.playlistDetail__back}>
          <IconChevronLeft
            className={styles.playlistDetail__backIcon}
            aria-hidden="true"
            focusable="false"
          />
          Back to home
        </Link>
      </nav>

      <div className={styles.playlistDetail__columns}>
        <div className={styles.playlistDetail__side}>
          {playlist.isSuccess ? (
            <PlaylistHeader
              playlist={playlist.data}
              ownerName={ownerName}
              arrangement={isMobile ? 'row' : 'card'}
              heading
              onPlay={playPlaylist}
              playing={playingThis}
              current={isQueue}
              onSkipBack={skipPrevious}
              onSkipNext={skipNext}
              hasNext={hasNext}
              onShuffle={() => setShuffle(!shuffled)}
              shuffled={shuffled}
              onSync={canSync ? () => sync.mutate() : undefined}
              syncing={sync.isPending}
              onShare={
                access === 'owner' ? () => setShareOpen(true) : undefined
              }
              onRename={
                access === 'owner' ? () => setRenameOpen(true) : undefined
              }
              onDelete={access === 'owner' ? deletePlaylist : undefined}
            />
          ) : null}

          {failed && latestRun.isSuccess ? (
            <div className={styles.playlistDetail__state}>
              <SyncError
                trackCount={playlist.data?.trackCount ?? null}
                rawError={latestRun.data?.error ?? null}
                onRetry={
                  canSync
                    ? () => {
                        sync.mutate();
                      }
                    : undefined
                }
                retrying={sync.isPending}
              />
            </div>
          ) : null}

          {!failed &&
          latestRun.data !== null &&
          latestRun.data !== undefined ? (
            <div className={styles.playlistDetail__state}>
              <SyncSummary
                run={latestRun.data}
                now={new Date()}
                downloadingCount={downloadingCount}
              />
            </div>
          ) : null}
        </div>

        <div className={styles.playlistDetail__tracks}>
          {tracks.isPending ? (
            <p className={styles.playlistDetail__note}>Loading tracks.</p>
          ) : null}
          {tracks.isError ? (
            <p className={styles.playlistDetail__note} role="alert">
              Tracks could not be loaded.
            </p>
          ) : null}
          {neverSynced && tracks.isSuccess && tracks.data.length === 0 ? (
            <EmptyState
              onSync={canSync ? () => sync.mutate() : undefined}
              syncing={sync.isPending}
            />
          ) : null}
          {!neverSynced && tracks.isSuccess && tracks.data.length === 0 ? (
            <p className={styles.playlistDetail__note}>No tracks yet.</p>
          ) : null}
          {tracks.isSuccess && tracks.data.length > 0 ? (
            <ul className={styles.playlistDetail__list}>
              {tracks.data.map(association => (
                <TrackRow
                  key={association.track.id}
                  association={association}
                  current={association.track.id === currentId}
                  playing={isPlaying}
                  onPlay={playTrack}
                  onRetry={canWrite ? id => retry.mutate(id) : undefined}
                  onRemove={
                    canWrite ? id => removeTrackDeferred(id) : undefined
                  }
                  retrying={retryingTrackId === association.track.id}
                />
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {renameOpen && playlist.data !== undefined ? (
        <RenamePlaylistDialog
          open={renameOpen}
          currentName={playlist.data.name}
          isWorking={rename.isPending}
          problem={
            rename.isError && rename.error instanceof ApiError
              ? (rename.error.problem?.detail ?? null)
              : null
          }
          onSubmit={name =>
            rename.mutate(name, {
              onSuccess: () => setRenameOpen(false)
            })
          }
          onClose={() => setRenameOpen(false)}
        />
      ) : null}

      <SharePlaylistDialog
        open={shareOpen}
        playlistId={playlistId}
        onClose={() => setShareOpen(false)}
      />

      {deferred.pending !== null ? (
        <UndoToast
          message={deferred.pending.message}
          detail={deferred.pending.detail}
          durationMs={UNDO_WINDOW_MS}
          actionLabel="Cancel"
          onAction={deferred.cancel}
          onDismiss={deferred.cancel}
        />
      ) : null}
    </main>
  );
}
