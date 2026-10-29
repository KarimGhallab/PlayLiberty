import { create } from 'zustand';

import type {
  BareTrack,
  PersistedPlayerState,
  PlayerState,
  PlayerTrack
} from '../types';
import {
  SeekDirection,
  currentIndex,
  currentTrack,
  nextIndex,
  queuePlaylistId
} from '../types';

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

/*
 * The order last heard, or null unless the ids are exactly the source's: a stale
 * or foreign payload falls back to the playlist order rather than dropping a
 * track or repeating one.
 */
function restoredQueue(
  sourceQueue: readonly PlayerTrack[],
  orderIds: readonly string[]
): PlayerTrack[] | null {
  if (orderIds.length !== sourceQueue.length) {
    return null;
  }

  const byId = new Map(sourceQueue.map(track => [track.id, track] as const));
  const queue: PlayerTrack[] = [];

  for (const id of orderIds) {
    const track = byId.get(id);

    if (track === undefined) {
      return null;
    }

    byId.delete(id);
    queue.push(track);
  }

  return queue;
}

function clampVolume(volume: number): number {
  if (Number.isNaN(volume)) {
    return 1;
  }

  return Math.min(1, Math.max(0, volume));
}

/* The store's one position bound: the current track's declared duration, or
 * null while there is no duration to measure against. */
function boundedPosition(state: PlayerState, seconds: number): number | null {
  const duration = currentTrack(state)?.durationSeconds ?? null;

  if (duration === null || duration <= 0 || !Number.isFinite(seconds)) {
    return null;
  }

  return Math.min(duration, Math.max(0, seconds));
}

/* A target the element is already standing on is not worth a write. */
const SEEK_EPSILON_SECONDS = 0.5;

export function shouldApplySeek(currentTime: number, target: number): boolean {
  return Math.abs(currentTime - target) > SEEK_EPSILON_SECONDS;
}

/* The one write a step and a jump share: bound the target, then ask the
 * element to apply it. */
function seekPatch(state: PlayerState, seconds: number): Partial<PlayerState> {
  const position = boundedPosition(state, seconds);

  if (position === null) {
    return state;
  }

  return { positionSeconds: position, seekTo: position };
}

function signedStep(direction: SeekDirection, seconds: number): number {
  return direction === SeekDirection.Forward ? seconds : -seconds;
}

/* A restored offset only resumes a track it still fits: a vanished track, an
 * unknown duration, or a position outside the track starts at zero. */
function restoredPosition(
  track: PlayerTrack | undefined,
  positionSeconds: number
): number {
  if (track === undefined || track.durationSeconds === null) {
    return 0;
  }

  if (
    !Number.isFinite(positionSeconds) ||
    positionSeconds <= 0 ||
    positionSeconds >= track.durationSeconds
  ) {
    return 0;
  }

  return positionSeconds;
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

/* The keyboard's step and the Media Session's larger one: the caller names the
 * direction, the store owns the distance. */
const KEYBOARD_SEEK_SECONDS = 5;
const MEDIA_SESSION_SEEK_SECONDS = 10;

/* How far into a track a previous press means "step back", not "restart". */
const SKIP_PREVIOUS_GRACE_SECONDS = 5;

export const usePlayerStore = create<PlayerState>()((set, get) => ({
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
    set(() => {
      const restored = state.shuffle
        ? restoredQueue(state.sourceQueue, state.orderIds)
        : null;
      const queue = restored ?? [...state.sourceQueue];
      const current = queue.find(track => track.id === state.currentId);

      return {
        queue,
        sourceQueue: [...state.sourceQueue],
        currentId: current === undefined ? null : state.currentId,
        positionSeconds: restoredPosition(current, state.positionSeconds),
        seekTo: null,
        volume: clampVolume(state.volume),
        shuffle: restored !== null
      };
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
  startBareTrack: (track: BareTrack) =>
    set(() => {
      const bare: PlayerTrack = {
        ...track,
        playlistId: null,
        playlistName: null
      };

      return {
        queue: [bare],
        sourceQueue: [bare],
        currentId: bare.id,
        positionSeconds: 0,
        seekTo: null,
        isPlaying: true,
        shuffle: false
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
  seekBy: (direction: SeekDirection) =>
    set(state => {
      const step = signedStep(direction, KEYBOARD_SEEK_SECONDS);

      return seekPatch(state, state.positionSeconds + step);
    }),
  seekByPage: (direction: SeekDirection) =>
    set(state => {
      const step = signedStep(direction, MEDIA_SESSION_SEEK_SECONDS);

      return seekPatch(state, state.positionSeconds + step);
    }),
  seekToFraction: (fraction: number) =>
    set(state => {
      const duration = currentTrack(state)?.durationSeconds ?? null;

      if (duration === null || duration <= 0 || !Number.isFinite(fraction)) {
        return state;
      }

      const clamped = Math.min(1, Math.max(0, fraction));

      return seekPatch(state, clamped * duration);
    }),
  seekToStart: () => set(state => seekPatch(state, 0)),
  seekToEnd: () =>
    set(state => {
      const duration = currentTrack(state)?.durationSeconds ?? null;

      if (duration === null || duration <= 0) {
        return state;
      }

      return seekPatch(state, duration);
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
  consumeSeek: () => {
    const target = get().seekTo;

    if (target !== null) {
      set({ seekTo: null });
    }

    return target;
  },
  setPosition: (seconds: number) =>
    set(state => {
      const position = boundedPosition(state, seconds);

      if (position !== null) {
        return { positionSeconds: position };
      }

      return Number.isFinite(seconds)
        ? { positionSeconds: Math.max(0, seconds) }
        : state;
    }),
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
