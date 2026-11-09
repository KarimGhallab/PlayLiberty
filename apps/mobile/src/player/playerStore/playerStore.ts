import { create } from 'zustand';

import {
  seekPatch as boundedSeek,
  mergeIds,
  previousMove,
  randomItem,
  seekFractionPatch,
  shuffleIds
} from '@playliberty/player';

import type { PlayerPlaylist, PlayerTrack } from '../playerTrack';

/* The queue is client state and never reaches the server. It holds track ids,
 * so a stream address is derived when a track is reached. */

function tracksById(
  tracks: readonly PlayerTrack[]
): Readonly<Record<string, PlayerTrack>> {
  return Object.fromEntries(tracks.map(track => [track.id, track]));
}

function sameOrder(
  current: readonly string[],
  incoming: readonly string[]
): boolean {
  return (
    current.length === incoming.length &&
    current.every((id, index) => id === incoming[index])
  );
}

function sameTracks(
  current: Readonly<Record<string, PlayerTrack>>,
  incoming: readonly PlayerTrack[]
): boolean {
  if (Object.keys(current).length !== incoming.length) {
    return false;
  }

  return incoming.every(track => {
    const existing = current[track.id];

    return (
      existing !== undefined &&
      existing.title === track.title &&
      existing.durationSeconds === track.durationSeconds &&
      existing.thumbnailPath === track.thumbnailPath
    );
  });
}

function withoutTrack(
  tracks: Readonly<Record<string, PlayerTrack>>,
  trackId: string
): Readonly<Record<string, PlayerTrack>> {
  const next = { ...tracks };

  delete next[trackId];

  return next;
}

function currentDuration(state: PlayerState): number | null {
  if (state.currentId === null) {
    return null;
  }

  const duration = state.tracks[state.currentId]?.durationSeconds ?? null;

  return duration !== null && duration > 0 ? duration : null;
}

/* The store's one position bound: the current track's own duration. */
function boundedPosition(state: PlayerState, seconds: number): number | null {
  if (!Number.isFinite(seconds)) {
    return null;
  }

  const duration = currentDuration(state);

  if (duration === null) {
    return Math.max(0, seconds);
  }

  return Math.min(duration, Math.max(0, seconds));
}

function seekPatch(
  state: PlayerState,
  seconds: number
): Partial<PlayerState> | PlayerState {
  return boundedSeek(currentDuration(state), seconds) ?? state;
}

export interface PlayerState {
  /* The order being played: the playlist's own, or a shuffle of it. */
  readonly queue: readonly string[];
  /* The playlist's own order, so turning shuffle off restores it. */
  readonly sourceQueue: readonly string[];
  /* The metadata of every queued track, keyed by id. */
  readonly tracks: Readonly<Record<string, PlayerTrack>>;
  readonly playlistId: string | null;
  readonly playlistName: string | null;
  readonly playlistCoverUpdatedAt: string | null;
  readonly playlistCoverTrackId: string | null;
  readonly currentId: string | null;
  readonly shuffle: boolean;
  readonly isPlaying: boolean;
  readonly positionSeconds: number;
  /* A seek the player has not applied yet; it is cleared when applied. */
  readonly seekTo: number | null;
  /* The track whose playback failed, while the notice is on screen. */
  readonly playbackFailureId: string | null;
  /* The one-time notice that the notification permission was refused. */
  readonly backgroundNotice: boolean;
  start: (
    tracks: readonly PlayerTrack[],
    playlist: PlayerPlaylist | null,
    currentId: string,
    shuffle?: boolean
  ) => void;
  startBareTrack: (track: PlayerTrack) => void;
  applyRefetch: (playlistId: string, tracks: readonly PlayerTrack[]) => void;
  setShuffle: (shuffle: boolean) => void;
  play: (trackId: string) => void;
  setPlaying: (playing: boolean) => void;
  failPlayback: (trackId: string) => void;
  dismissPlaybackFailure: () => void;
  showBackgroundNotice: () => void;
  dismissBackgroundNotice: () => void;
  setPosition: (seconds: number) => void;
  seekToFraction: (fraction: number) => void;
  seekBy: (seconds: number) => void;
  consumeSeek: () => number | null;
  skipNext: () => void;
  skipPrevious: () => void;
  advance: () => void;
  drop: (trackId: string) => void;
  clear: () => void;
}

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  queue: [],
  sourceQueue: [],
  tracks: {},
  playlistId: null,
  playlistName: null,
  playlistCoverUpdatedAt: null,
  playlistCoverTrackId: null,
  currentId: null,
  shuffle: false,
  isPlaying: false,
  positionSeconds: 0,
  seekTo: null,
  playbackFailureId: null,
  backgroundNotice: false,
  start: (tracks, playlist, currentId, shuffle = false) => {
    const queue = tracks.map(track => track.id);

    set({
      queue: shuffle ? shuffleIds(queue, currentId) : queue,
      sourceQueue: queue,
      tracks: tracksById(tracks),
      playlistId: playlist?.id ?? null,
      playlistName: playlist?.name ?? null,
      playlistCoverUpdatedAt: playlist?.coverUpdatedAt ?? null,
      playlistCoverTrackId: playlist?.coverTrackId ?? null,
      currentId,
      shuffle,
      isPlaying: true,
      positionSeconds: 0,
      seekTo: null,
      playbackFailureId: null
    });
  },
  startBareTrack: track =>
    set({
      queue: [track.id],
      sourceQueue: [track.id],
      tracks: { [track.id]: track },
      playlistId: null,
      playlistName: null,
      playlistCoverUpdatedAt: null,
      playlistCoverTrackId: null,
      currentId: track.id,
      shuffle: false,
      isPlaying: true,
      positionSeconds: 0,
      seekTo: null,
      playbackFailureId: null
    }),
  applyRefetch: (playlistId, incoming) =>
    set(state => {
      // Another playlist's read is not this queue; merging it would extend it.
      if (state.playlistId !== playlistId) {
        return state;
      }

      /* Unshuffled, the queue is the read's order; shuffled, the incoming
       * entries join the arrangement already playing. */
      const sourceQueue = incoming.map(track => track.id);
      const queue = state.shuffle
        ? mergeIds(
            state.queue,
            incoming.map(track => track.id)
          )
        : sourceQueue;
      const tracks = tracksById(incoming);
      const currentStillThere =
        state.currentId !== null && queue.includes(state.currentId);

      if (
        (currentStillThere || state.currentId === null) &&
        sameOrder(state.queue, queue) &&
        sameOrder(state.sourceQueue, sourceQueue) &&
        sameTracks(state.tracks, incoming)
      ) {
        return state;
      }

      if (!currentStillThere) {
        return {
          queue,
          sourceQueue,
          tracks,
          currentId: null,
          isPlaying: false,
          positionSeconds: 0,
          seekTo: null,
          playbackFailureId: null
        };
      }

      return { queue, sourceQueue, tracks };
    }),
  /* Turning shuffle on draws a new order and a new leader; turning it off
   * restores the playlist order and leaves the playhead in place. */
  setShuffle: shuffle =>
    set(state => {
      if (state.shuffle === shuffle) {
        return state;
      }

      if (!shuffle) {
        return { shuffle, queue: [...state.sourceQueue] };
      }

      const leader = randomItem(state.queue);

      if (leader === undefined) {
        return { shuffle };
      }

      return {
        shuffle,
        queue: shuffleIds(state.queue, leader),
        currentId: leader,
        positionSeconds: 0,
        seekTo: null,
        playbackFailureId: null
      };
    }),
  play: trackId =>
    set(state => {
      if (!state.queue.includes(trackId)) {
        return state;
      }

      if (state.currentId === trackId) {
        return { isPlaying: true, playbackFailureId: null };
      }

      return {
        currentId: trackId,
        isPlaying: true,
        positionSeconds: 0,
        seekTo: null,
        playbackFailureId: null
      };
    }),
  setPlaying: playing =>
    set(state => {
      if (state.currentId === null) {
        return state;
      }

      if (
        state.isPlaying === playing &&
        (playing === false || state.playbackFailureId === null)
      ) {
        return state;
      }

      return playing
        ? { isPlaying: true, playbackFailureId: null }
        : { isPlaying: false };
    }),
  failPlayback: trackId =>
    set(state =>
      state.tracks[trackId] === undefined
        ? state
        : { playbackFailureId: trackId, isPlaying: false }
    ),
  dismissPlaybackFailure: () =>
    set(state =>
      state.playbackFailureId === null ? state : { playbackFailureId: null }
    ),
  showBackgroundNotice: () =>
    set(state => (state.backgroundNotice ? state : { backgroundNotice: true })),
  dismissBackgroundNotice: () =>
    set(state =>
      state.backgroundNotice ? { backgroundNotice: false } : state
    ),
  setPosition: seconds =>
    set(state => {
      if (state.currentId === null) {
        return state;
      }

      const position = boundedPosition(state, seconds);

      return position === null ? state : { positionSeconds: position };
    }),
  seekToFraction: fraction =>
    set(state => seekFractionPatch(currentDuration(state), fraction) ?? state),
  seekBy: seconds =>
    set(state => {
      if (currentDuration(state) === null || !Number.isFinite(seconds)) {
        return state;
      }

      return seekPatch(state, state.positionSeconds + seconds);
    }),
  consumeSeek: () => {
    const target = get().seekTo;

    if (target !== null) {
      set({ seekTo: null });
    }

    return target;
  },
  skipNext: () => {
    const { queue, currentId } = get();
    const index = currentId === null ? -1 : queue.indexOf(currentId);
    const next = queue[index + 1];

    if (next === undefined) {
      return;
    }

    set({
      currentId: next,
      positionSeconds: 0,
      isPlaying: true,
      seekTo: null,
      playbackFailureId: null
    });
  },
  skipPrevious: () => {
    const { queue, currentId, positionSeconds } = get();
    const index = currentId === null ? -1 : queue.indexOf(currentId);
    const move = previousMove(index, positionSeconds);

    if (move === null) {
      return;
    }

    if (move === 'previous') {
      const previous = queue[index - 1];

      if (previous !== undefined) {
        set({
          currentId: previous,
          positionSeconds: 0,
          isPlaying: true,
          seekTo: null,
          playbackFailureId: null
        });
        return;
      }
    }

    set({
      positionSeconds: 0,
      isPlaying: true,
      seekTo: null,
      playbackFailureId: null
    });
  },
  advance: () => {
    const { queue, currentId } = get();
    const index = currentId === null ? -1 : queue.indexOf(currentId);
    const next = queue[index + 1] ?? null;

    set({
      currentId: next,
      isPlaying: next !== null,
      positionSeconds: 0,
      seekTo: null,
      playbackFailureId: null
    });
  },
  drop: trackId => {
    const {
      queue,
      sourceQueue,
      tracks,
      currentId,
      isPlaying,
      playbackFailureId
    } = get();
    const index = queue.indexOf(trackId);

    if (index < 0) {
      return;
    }

    const nextQueue = queue.filter(id => id !== trackId);
    const nextSource = sourceQueue.filter(id => id !== trackId);
    const nextTracks = withoutTrack(tracks, trackId);
    const nextFailure =
      playbackFailureId === trackId ? null : playbackFailureId;

    if (currentId !== trackId) {
      set({
        queue: nextQueue,
        sourceQueue: nextSource,
        tracks: nextTracks,
        playbackFailureId: nextFailure
      });
      return;
    }

    // A dropped current track advances; if it was the last one the queue ends.
    const next = nextQueue[index] ?? null;

    set({
      queue: nextQueue,
      sourceQueue: nextSource,
      tracks: nextTracks,
      currentId: next,
      isPlaying: next === null ? false : isPlaying,
      positionSeconds: 0,
      seekTo: null,
      playbackFailureId: null
    });
  },
  clear: () =>
    set({
      queue: [],
      sourceQueue: [],
      tracks: {},
      playlistId: null,
      playlistName: null,
      playlistCoverUpdatedAt: null,
      playlistCoverTrackId: null,
      currentId: null,
      shuffle: false,
      isPlaying: false,
      positionSeconds: 0,
      seekTo: null,
      playbackFailureId: null,
      backgroundNotice: false
    })
}));
