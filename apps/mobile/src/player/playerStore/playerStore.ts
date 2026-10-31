import { create } from 'zustand';

import type { PlayerPlaylist, PlayerTrack } from '../playerTrack/playerTrack';

/* The queue is client state and never reaches the server. It holds track ids,
 * so a stream address is derived when a track is reached. */

/* Fisher-Yates over the rest, the leader hoisted to the front: the transport
 * starts on the first entry, so shuffling changes order, not track. */
function shuffledWithLeader(
  queue: readonly string[],
  leaderId: string
): readonly string[] {
  const leader = queue.includes(leaderId) ? leaderId : undefined;
  const rest = queue.filter(id => id !== leader);

  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const picked = rest[i];
    const other = rest[j];

    if (picked === undefined || other === undefined) {
      continue;
    }

    rest[i] = other;
    rest[j] = picked;
  }

  return leader === undefined ? rest : [leader, ...rest];
}

function randomId(queue: readonly string[]): string | undefined {
  return queue.length === 0
    ? undefined
    : queue[Math.floor(Math.random() * queue.length)];
}

/* How far into a track a previous press still means the entry before it. */
const PREVIOUS_GRACE_SECONDS = 5;

function tracksById(
  tracks: readonly PlayerTrack[]
): Readonly<Record<string, PlayerTrack>> {
  return Object.fromEntries(tracks.map(track => [track.id, track]));
}

function withoutTrack(
  tracks: Readonly<Record<string, PlayerTrack>>,
  trackId: string
): Readonly<Record<string, PlayerTrack>> {
  const next = { ...tracks };

  delete next[trackId];

  return next;
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
  readonly currentId: string | null;
  readonly shuffle: boolean;
  readonly isPlaying: boolean;
  readonly positionSeconds: number;
  start: (
    tracks: readonly PlayerTrack[],
    playlist: PlayerPlaylist | null,
    currentId: string,
    shuffle?: boolean
  ) => void;
  startBareTrack: (track: PlayerTrack) => void;
  setShuffle: (shuffle: boolean) => void;
  play: (trackId: string) => void;
  setPlaying: (playing: boolean) => void;
  setPosition: (seconds: number) => void;
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
  currentId: null,
  shuffle: false,
  isPlaying: false,
  positionSeconds: 0,
  start: (tracks, playlist, currentId, shuffle = false) => {
    const queue = tracks.map(track => track.id);

    set({
      queue: shuffle ? shuffledWithLeader(queue, currentId) : queue,
      sourceQueue: queue,
      tracks: tracksById(tracks),
      playlistId: playlist?.id ?? null,
      playlistName: playlist?.name ?? null,
      currentId,
      shuffle,
      isPlaying: true,
      positionSeconds: 0
    });
  },
  startBareTrack: track =>
    set({
      queue: [track.id],
      sourceQueue: [track.id],
      tracks: { [track.id]: track },
      playlistId: null,
      playlistName: null,
      currentId: track.id,
      shuffle: false,
      isPlaying: true,
      positionSeconds: 0
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

      const leader = randomId(state.queue);

      if (leader === undefined) {
        return { shuffle };
      }

      return {
        shuffle,
        queue: shuffledWithLeader(state.queue, leader),
        currentId: leader,
        positionSeconds: 0
      };
    }),
  play: trackId =>
    set(state => {
      if (!state.queue.includes(trackId)) {
        return state;
      }

      if (state.currentId === trackId) {
        return { isPlaying: true };
      }

      return { currentId: trackId, isPlaying: true, positionSeconds: 0 };
    }),
  setPlaying: playing =>
    set(state => (state.currentId === null ? state : { isPlaying: playing })),
  setPosition: seconds =>
    set(state => {
      if (state.currentId === null || !Number.isFinite(seconds)) {
        return state;
      }

      return { positionSeconds: Math.max(0, seconds) };
    }),
  skipNext: () => {
    const { queue, currentId } = get();
    const index = currentId === null ? -1 : queue.indexOf(currentId);
    const next = queue[index + 1];

    if (next === undefined) {
      return;
    }

    set({ currentId: next, positionSeconds: 0, isPlaying: true });
  },
  skipPrevious: () => {
    const { queue, currentId, positionSeconds } = get();
    const index = currentId === null ? -1 : queue.indexOf(currentId);

    if (index < 0) {
      return;
    }

    if (index > 0 && positionSeconds < PREVIOUS_GRACE_SECONDS) {
      const previous = queue[index - 1];

      if (previous !== undefined) {
        set({ currentId: previous, positionSeconds: 0, isPlaying: true });
        return;
      }
    }

    set({ positionSeconds: 0, isPlaying: true });
  },
  advance: () => {
    const { queue, currentId } = get();
    const index = currentId === null ? -1 : queue.indexOf(currentId);
    const next = queue[index + 1] ?? null;

    set({ currentId: next, isPlaying: next !== null, positionSeconds: 0 });
  },
  drop: trackId => {
    const { queue, sourceQueue, tracks, currentId, isPlaying } = get();
    const index = queue.indexOf(trackId);

    if (index < 0) {
      return;
    }

    const nextQueue = queue.filter(id => id !== trackId);
    const nextSource = sourceQueue.filter(id => id !== trackId);
    const nextTracks = withoutTrack(tracks, trackId);

    if (currentId !== trackId) {
      set({ queue: nextQueue, sourceQueue: nextSource, tracks: nextTracks });
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
      positionSeconds: 0
    });
  },
  clear: () =>
    set({
      queue: [],
      sourceQueue: [],
      tracks: {},
      playlistId: null,
      playlistName: null,
      currentId: null,
      shuffle: false,
      isPlaying: false,
      positionSeconds: 0
    })
}));
