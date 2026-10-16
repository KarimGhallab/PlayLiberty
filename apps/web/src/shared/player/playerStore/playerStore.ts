import { create } from 'zustand';

import type { PersistedPlayerState, PlayerState, PlayerTrack } from '../types';
import { currentIndex, nextIndex, queuePlaylistId } from '../types';

/* Merge a refetch by id: known ids keep their sequence in a shuffled queue, new
 * ids append, a dropped track is gone, and the current id survives. */
export function mergeQueue(
  current: readonly PlayerTrack[],
  incoming: readonly PlayerTrack[]
): PlayerTrack[] {
  const incomingById = new Map(
    incoming.map(track => [track.id, track] as const)
  );
  const kept: PlayerTrack[] = [];

  for (const track of current) {
    const updated = incomingById.get(track.id);

    if (updated !== undefined) {
      kept.push(updated);
    }
  }

  const keptIds = new Set(kept.map(track => track.id));

  return [...kept, ...incoming.filter(track => !keptIds.has(track.id))];
}

function clampVolume(volume: number): number {
  if (Number.isNaN(volume)) {
    return 1;
  }

  return Math.min(1, Math.max(0, volume));
}

/* A random entry, or undefined when empty. Shuffle draws a new leader rather
 * than taking the track the playhead already stands on. */
export function randomTrack(
  queue: readonly PlayerTrack[]
): PlayerTrack | undefined {
  if (queue.length === 0) {
    return undefined;
  }

  return queue[Math.floor(Math.random() * queue.length)];
}

/*
 * Fisher-Yates over the rest, the leader hoisted to the front: the transport
 * starts on the first entry, so shuffling changes order, not track.
 */
function shuffledWithLeader(
  queue: readonly PlayerTrack[],
  leaderId: string | null
): PlayerTrack[] {
  const leader =
    leaderId === null ? undefined : queue.find(track => track.id === leaderId);
  const rest = queue.filter(track => track.id !== leader?.id);

  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  /* No leader in the queue to hoist; the scatter is all there is. */
  return leader === undefined ? rest : [leader, ...rest];
}

/* How far into a track a previous press means "step back", not "restart". */
const SKIP_PREVIOUS_GRACE_SECONDS = 5;

export const usePlayerStore = create<PlayerState>()(set => ({
  queue: [],
  sourceQueue: [],
  currentId: null,
  positionSeconds: 0,
  volume: 1,
  seekTo: null,
  isPlaying: false,
  shuffle: false,
  muted: false,
  hydrate: (state: PersistedPlayerState) =>
    set({
      queue: [...state.sourceQueue],
      sourceQueue: [...state.sourceQueue],
      currentId: state.currentId,
      positionSeconds: state.positionSeconds,
      volume: clampVolume(state.volume),
      shuffle: false
    }),
  startQueue: (
    playlistId: string,
    tracks: readonly PlayerTrack[],
    startTrackId: string,
    shuffle = false
  ) =>
    set(() => {
      /* A start track not in the list is no queue: empty is honest. */
      const queue = tracks.filter(track => track.playlistId === playlistId);

      if (!queue.some(track => track.id === startTrackId)) {
        return {
          queue: [],
          sourceQueue: [],
          currentId: null,
          positionSeconds: 0,
          seekTo: null,
          isPlaying: false,
          shuffle: false
        };
      }

      return {
        queue: shuffle ? shuffledWithLeader(queue, startTrackId) : queue,
        sourceQueue: queue,
        currentId: startTrackId,
        positionSeconds: 0,
        seekTo: null,
        isPlaying: true,
        shuffle
      };
    }),
  applyRefetch: (playlistId: string, tracks: readonly PlayerTrack[]) =>
    set(state => {
      /* A refetch of another playlist is not this queue; merging it in would
       * extend the queue across playlists. */
      if (queuePlaylistId(state) !== playlistId) {
        return state;
      }

      const queue = state.shuffle
        ? mergeQueue(state.queue, tracks)
        : [...tracks];
      const sourceQueue = [...tracks];
      const currentStillThere =
        state.currentId !== null &&
        queue.some(track => track.id === state.currentId);

      /*
       * The current track and offset do not move, unless the current track
       * leaves the source: then the cursor clears and the queue stops.
       */
      if (!currentStillThere) {
        return {
          queue,
          sourceQueue,
          currentId: null,
          positionSeconds: 0,
          seekTo: null,
          isPlaying: false
        };
      }

      return { queue, sourceQueue };
    }),
  play: (id: string) =>
    set(state => {
      if (!state.queue.some(track => track.id === id)) {
        return state;
      }

      if (state.currentId === id) {
        return { isPlaying: true };
      }

      return {
        currentId: id,
        positionSeconds: 0,
        seekTo: null,
        isPlaying: true
      };
    }),
  remove: (id: string) =>
    set(state => {
      const queue = state.queue.filter(track => track.id !== id);
      const sourceQueue = state.sourceQueue.filter(track => track.id !== id);

      if (state.currentId !== id) {
        return { queue, sourceQueue };
      }

      return {
        queue,
        sourceQueue,
        currentId: null,
        positionSeconds: 0,
        seekTo: null,
        isPlaying: false
      };
    }),
  dropAndAdvance: (id: string) =>
    set(state => {
      const index = state.queue.findIndex(track => track.id === id);

      const queue = state.queue.filter(track => track.id !== id);
      const sourceQueue = state.sourceQueue.filter(track => track.id !== id);

      if (state.currentId !== id) {
        return { queue, sourceQueue };
      }

      /*
       * The failure is the current track's, so the queue continues from the
       * entry that now occupies its place; at the last entry it stops.
       */
      const next = index >= 0 ? queue[index] : undefined;

      if (next === undefined) {
        return {
          queue,
          sourceQueue,
          currentId: null,
          positionSeconds: 0,
          seekTo: null,
          isPlaying: false
        };
      }

      return {
        queue,
        sourceQueue,
        currentId: next.id,
        positionSeconds: 0,
        seekTo: null,
        isPlaying: true
      };
    }),
  skipNext: () =>
    set(state => {
      const next = nextIndex(state);

      if (next < 0) {
        return state;
      }

      return {
        currentId: state.queue[next].id,
        positionSeconds: 0,
        seekTo: null,
        isPlaying: true
      };
    }),
  skipPrevious: () =>
    set(state => {
      const index = currentIndex(state);

      if (index < 0) {
        return state;
      }

      /* Inside the grace window, step back; past it or at the first track, the
       * track restarts in place, `seekTo` carrying the jump, and resumes. */
      if (index > 0 && state.positionSeconds < SKIP_PREVIOUS_GRACE_SECONDS) {
        return {
          currentId: state.queue[index - 1].id,
          positionSeconds: 0,
          seekTo: null,
          isPlaying: true
        };
      }

      return { positionSeconds: 0, seekTo: 0, isPlaying: true };
    }),
  advance: () =>
    set(state => {
      const next = nextIndex(state);

      /*
       * The end of the queue stops rather than wrapping: the playhead returns
       * to the last track's start, where "skip at the end" would do nothing.
       */
      if (next < 0) {
        return { positionSeconds: 0, seekTo: null, isPlaying: false };
      }

      return {
        currentId: state.queue[next].id,
        positionSeconds: 0,
        seekTo: null,
        isPlaying: true
      };
    }),
  seek: (seconds: number) =>
    set(() => {
      const clamped = Math.max(0, seconds);
      return { positionSeconds: clamped, seekTo: clamped };
    }),
  setShuffle: (shuffle: boolean) =>
    set(state => {
      if (state.shuffle === shuffle) {
        return state;
      }

      /* Turning shuffle on draws a new order and a new leader; turning it off
       * restores the playlist order and leaves the playhead in place. */
      if (!shuffle) {
        return { shuffle, queue: [...state.sourceQueue] };
      }

      const leader = randomTrack(state.queue);

      if (leader === undefined) {
        return { shuffle };
      }

      return {
        shuffle,
        queue: shuffledWithLeader(state.queue, leader.id),
        currentId: leader.id,
        positionSeconds: 0,
        seekTo: null,
        isPlaying: true
      };
    }),
  clearSeek: () => set({ seekTo: null }),
  setPosition: (seconds: number) => set({ positionSeconds: seconds }),
  setPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setVolume: (volume: number) => set({ volume: clampVolume(volume) }),
  setMuted: (muted: boolean) => set({ muted }),
  clear: () =>
    set({
      queue: [],
      sourceQueue: [],
      currentId: null,
      positionSeconds: 0,
      seekTo: null,
      isPlaying: false,
      shuffle: false,
      muted: false
    })
}));
