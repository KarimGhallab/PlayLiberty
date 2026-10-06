import { IconChevronLeft, IconPlus } from '@tabler/icons-react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';

import { PlaylistSyncStatus, TrackFileStatus } from '@playliberty/contracts';

import { ApiError } from '../../../shared/api/client/client';
import {
  ownerNameFrom,
  useAccountDirectory,
  useAddTrack,
  useDeletePlaylist,
  useFetchTrackWhole,
  useLatestSyncRun,
  usePlaylist,
  usePlaylistTracks,
  usePlaylists,
  useRemoveTrack,
  useRenamePlaylist,
  useRetryTrack,
  useSyncPlaylist,
  useUpdateSkipNonMusic
} from '../../../shared/api/queries/queries';
import AddTrackDialog from '../../../shared/components/AddTrackDialog/AddTrackDialog';
import EmptyState from '../../../shared/components/EmptyState/EmptyState';
import NoticeToast from '../../../shared/components/NoticeToast/NoticeToast';
import PlaylistHeader from '../../../shared/components/PlaylistHeader/PlaylistHeader';
import PlaylistNotFound from '../../../shared/components/PlaylistNotFound/PlaylistNotFound';
import PlaylistSkipSetting from '../../../shared/components/PlaylistSkipSetting/PlaylistSkipSetting';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import RenamePlaylistDialog from '../../../shared/components/RenamePlaylistDialog';
import SharePlaylistDialog from '../../../shared/components/SharePlaylistDialog/SharePlaylistDialog';
import SyncError from '../../../shared/components/SyncError/SyncError';
import SyncSummary from '../../../shared/components/SyncSummary/SyncSummary';
import TrackRow from '../../../shared/components/TrackRow/TrackRow';
import UndoToast from '../../../shared/components/UndoToast/UndoToast';
import {
  UNDO_WINDOW_MS,
  useDeferredAction
} from '../../../shared/components/useDeferredAction/useDeferredAction';
import { usePlayerStore } from '../../../shared/player/playerStore/playerStore';
import { toPlayerTracks } from '../../../shared/player/playerTracks/playerTracks';
import { orderTracksByQueue } from '../../../shared/player/queueOrder/queueOrder';
import { nextIndex } from '../../../shared/player/types';
import {
  NOTICE_WINDOW_MS,
  refusalNotice,
  useShufflePlaylist
} from '../../../shared/player/useShufflePlaylist/useShufflePlaylist';
import {
  MOBILE_QUERY,
  useMediaQuery
} from '../../../shared/useMediaQuery/useMediaQuery';

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
  /* The library read, which is where the writable playlists for the add dialog
   * come from: the dialog adds to several, and this is the list the account can
   * already see. */
  const playlists = usePlaylists();
  const sync = useSyncPlaylist(playlistId);
  const remove = useDeletePlaylist(playlistId);
  const retry = useRetryTrack(playlistId);
  const fetchWhole = useFetchTrackWhole(playlistId);
  const removeTrack = useRemoveTrack(playlistId);
  const rename = useRenamePlaylist(playlistId);
  const updateSkip = useUpdateSkipNonMusic(playlistId);
  const addTrack = useAddTrack();
  const [renameOpen, setRenameOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [settingRefused, setSettingRefused] = useState<string | null>(null);
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
  const queue = usePlayerStore(state => state.queue);
  const { shufflePlaylist, refusal } = useShufflePlaylist();
  const queuePlaylistId = usePlayerStore(
    state => state.queue[0]?.playlistId ?? null
  );
  /*
   * Whether the queue holds a track after the current one, which is what decides
   * if the header's forward step has anywhere to go. Derived from the queue
   * rather than the playlist because the transport acts on the queue, and from
   * the shared next-index rule, so a shuffled queue goes dead at its last entry
   * exactly as an unshuffled one does.
   */
  const hasNext = usePlayerStore(state => nextIndex(state) >= 0);

  const ownerName =
    playlist.data !== undefined && directory.data !== undefined
      ? ownerNameFrom(directory.data, playlist.data.ownerAccountId)
      : null;

  /*
   * A row press moves the playhead, and moves it inside the queue the listener
   * is looking at. When this playlist is already the queue, the queue's order is
   * the order the list is drawn in, so rebuilding it would put the pressed track
   * somewhere other than the row that was pressed; `play` moves the cursor and
   * changes nothing else. A press that has to build a queue builds it in the
   * playlist's own order and carries no shuffle, because the shuffle is the order
   * of a queue and a fresh one is in the order the playlist gave.
   *
   * It reads the store at call time rather than closing over `currentId` and
   * `isPlaying`, and is memoized, so its identity is stable across a queue
   * change. A fresh function each render would re-render every row that receives
   * it, which is the cost `TrackRow`'s memo exists to avoid.
   */
  const playTrack = useCallback(
    (trackId: string): void => {
      const player = usePlayerStore.getState();

      if (trackId === player.currentId) {
        player.setPlaying(!player.isPlaying);
        return;
      }

      if (player.queue[0]?.playlistId === playlistId) {
        player.play(trackId);
        return;
      }

      if (tracks.data === undefined || playlist.data === undefined) {
        return;
      }

      player.startQueue(
        playlistId,
        toPlayerTracks(tracks.data, playlistId, playlist.data.name),
        trackId
      );
    },
    [playlistId, tracks.data, playlist.data]
  );

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

    startQueue(playlistId, playerTracks, first.id, shuffled);
  };

  const deletePlaylist = (): void => {
    deferred.defer({
      id: playlistId,
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
  const removeTrackDeferred = useCallback(
    (trackId: string): void => {
      const title =
        tracks.data?.find(association => association.track.id === trackId)
          ?.track.title ?? 'Track';

      deferred.defer({
        id: trackId,
        message: 'Removing track',
        detail: title,
        commit: () => removeTrack.mutate(trackId)
      });
    },
    [tracks.data, deferred.defer, removeTrack.mutate]
  );

  /*
   * The lane's two actions, stable for the same reason `playTrack` is: each is
   * passed to every row, so a fresh identity would defeat the row's memo.
   */
  const retryTrack = useCallback(
    (trackId: string): void => retry.mutate(trackId),
    [retry.mutate]
  );
  const fetchWholeTrack = useCallback(
    (trackId: string): void => fetchWhole.mutate(trackId),
    [fetchWhole.mutate]
  );

  const access = playlist.data?.access;
  const canSync = access === 'owner' || access === 'write';
  const canWrite = canSync;
  /* The one track whose row action is in flight, so its menu is not opened onto
   * a second press while the first is still running. */
  const busyTrackId = retry.isPending
    ? retry.variables
    : fetchWhole.isPending
      ? fetchWhole.variables
      : undefined;
  const neverSynced = playlist.data?.lastSyncedAt === null;

  /*
   * The playlists the add dialog may offer: the account's own and any it can
   * write, never a read one, because a playlist it cannot write to is absent
   * rather than disabled. The one being looked at is always in the set when the
   * account can write to it, which is the state this control is drawn in.
   */
  const writablePlaylists = (playlists.data?.items ?? []).filter(
    item => item.access === 'owner' || item.access === 'write'
  );

  /*
   * The refused playlists of the last batch, which is what keeps the dialog open.
   * While a batch has refusals the dialog stays; one with none closes, because an
   * all-success result has nothing to read.
   */
  const refusedOutcomes =
    addTrack.data?.results.filter(entry => entry.outcome === 'refused') ?? [];
  const batchRefused = refusedOutcomes.length > 0;

  /*
   * A batch with no refusals closes the dialog on the settled result, and a fresh
   * open clears the previous one so a stale refusal does not reappear. The reset
   * runs when the dialog opens, so the block is empty until a batch returns.
   */
  useEffect(() => {
    if (addTrack.isSuccess && !batchRefused) {
      setAddOpen(false);
      addTrack.reset();
    }
  }, [addTrack.isSuccess, batchRefused]);

  /*
   * The setting's refusal withdraws itself, on the same window the shuffle notice
   * uses, so a failed change does not stand over the screen once it is read.
   */
  useEffect(() => {
    if (settingRefused === null) {
      return;
    }

    const timer = setTimeout(() => setSettingRefused(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [settingRefused]);
  const failed = playlist.data?.syncStatus === PlaylistSyncStatus.Error;
  const isQueue = queuePlaylistId === playlistId;
  const playlistPending = deferred.pending?.id === playlistId;
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
        {/*
         * The add control, mirroring the library's own: the same pill, the same
         * plus, in the top-right of the page. It is present for the owner and a
         * write collaborator and absent for a read one, the screen's own rule for
         * every control it does not offer a refusal through.
         */}
        {canWrite ? (
          <button
            type="button"
            className={styles.playlistDetail__add}
            onClick={() => {
              addTrack.reset();
              setAddOpen(true);
            }}>
            <IconPlus
              className={styles.playlistDetail__addIcon}
              aria-hidden="true"
              focusable="false"
            />
            Add a track
          </button>
        ) : null}
      </nav>

      <div className={styles.playlistDetail__columns}>
        <div className={styles.playlistDetail__side}>
          {playlist.isSuccess ? (
            <PlaylistHeader
              playlist={playlist.data}
              ownerName={ownerName}
              arrangement={isMobile ? 'row' : 'card'}
              heading
              ground
              onPlay={playPlaylist}
              playing={playingThis}
              current={isQueue}
              pending={playlistPending}
              onSkipBack={skipPrevious}
              onSkipNext={skipNext}
              hasNext={hasNext}
              onShuffle={() =>
                shufflePlaylist({
                  id: playlistId,
                  name: playlist.data?.name ?? 'This playlist'
                })
              }
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

          {/*
           * The skip setting, under the card. The owner and a write collaborator
           * may change it; a read collaborator sees the same switch disabled,
           * because the value is still theirs to read. The write is optimistic,
           * and a refusal puts the switch back and says why.
           */}
          {playlist.isSuccess ? (
            <PlaylistSkipSetting
              skipNonMusic={playlist.data.skipNonMusic}
              canEdit={canWrite}
              saving={updateSkip.isPending}
              onChange={value =>
                updateSkip.mutate(value, {
                  onError: error =>
                    setSettingRefused(
                      error instanceof ApiError
                        ? (error.problem?.detail ??
                            'The setting could not be changed.')
                        : 'The setting could not be changed.'
                    )
                })
              }
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
            <ReadFailure
              message="Tracks could not be loaded."
              error={tracks.error}
              onRetry={() => void tracks.refetch()}
              retrying={tracks.isFetching}
            />
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
              {(shuffled && isQueue
                ? orderTracksByQueue(tracks.data, queue)
                : tracks.data
              ).map(association => {
                /*
                 * `playing` is only read by a current row, so a non-current row
                 * is told `false` rather than the queue's state: the global
                 * `isPlaying` would change every row's props on a play or a
                 * pause and re-render the whole list.
                 */
                const isCurrent = association.track.id === currentId;

                return (
                  <TrackRow
                    key={association.track.id}
                    association={association}
                    current={isCurrent}
                    playing={isCurrent && isPlaying}
                    pending={
                      playlistPending ||
                      deferred.pending?.id === association.track.id
                    }
                    onPlay={playTrack}
                    onRetry={canWrite ? retryTrack : undefined}
                    onFetchWhole={canWrite ? fetchWholeTrack : undefined}
                    onRemove={canWrite ? removeTrackDeferred : undefined}
                    busy={busyTrackId === association.track.id}
                  />
                );
              })}
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

      <AddTrackDialog
        open={addOpen}
        currentPlaylistId={playlistId}
        playlists={writablePlaylists}
        isWorking={addTrack.isPending}
        result={addTrack.data ?? null}
        problem={
          addTrack.isError && addTrack.error instanceof ApiError
            ? (addTrack.error.problem?.detail ?? null)
            : null
        }
        onSubmit={(url, playlistIds) => addTrack.mutate({ url, playlistIds })}
        onClose={() => {
          setAddOpen(false);
          addTrack.reset();
        }}
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
      {refusal === null ? null : (
        <NoticeToast
          {...refusalNotice(refusal)}
          durationMs={NOTICE_WINDOW_MS}
        />
      )}
      {settingRefused === null ? null : (
        <NoticeToast
          message="The skip setting was not changed."
          detail={settingRefused}
          durationMs={NOTICE_WINDOW_MS}
        />
      )}
    </main>
  );
}
