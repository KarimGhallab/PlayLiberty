import { create } from 'zustand';

import type { PersistedPlayerState, PlayerState, PlayerTrack } from '../types';
import { currentIndex, nextIndex, queuePlaylistId } from '../types';

/*
 * A refetch returns the entries the server holds, in the playlist's saved order.
 * A shuffled queue keeps its own arrangement, so known ids keep their sequence and
 * new ids append in the read's order, and a track the refetch no longer returns is
 * gone. The current id survives either way, which is the whole point: the music
 * does not move under the listener.
 */
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

/*
 * A random entry of a queue, or undefined when it is empty. It is the draw the
 * shuffle spends on which track leads: pressing shuffle is asking for a new
 * arrangement and a new start, so the leader is drawn rather than taken from
 * wherever the playhead already stands.
 */
export function randomTrack(
  queue: readonly PlayerTrack[]
): PlayerTrack | undefined {
  if (queue.length === 0) {
    return undefined;
  }

  return queue[Math.floor(Math.random() * queue.length)];
}

/*
 * Fisher-Yates over every track but the one that leads the result. The leading
 * track is the one being played, or the first stored one when a fresh queue is
 * opened, and it is hoisted to the front rather than left where the shuffle
 * happens to put it: the transport starts on the first entry, so the first entry
 * is the track the press meant to keep. Shuffling is a change of order and not of
 * track, so the leading track does not move out of the queue, and everything
 * after it is a full scatter of the rest.
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

  /*
   * No leader to hoist: the caller named a track that is not in the queue, which
   * a built queue and a hydrated one both rule out. The scatter is all there is.
   */
  return leader === undefined ? rest : [leader, ...rest];
}

/*
 * How far into a track a previous press has to be before it means "restart this
 * one" rather than "step back". Five seconds is enough that a listener who has
 * just landed on the track and changed their mind steps back, while one who has
 * heard the opening restarts it. The first track has nothing behind it, so a
 * press there restarts rather than doing nothing.
 */
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
      /*
       * A start track the caller does not include is not a queue: there is nothing
       * to play. An empty queue is the honest answer, and the caller that built it
       * from a real list never hits this.
       */
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
      /*
       * A refetch of another playlist is not this queue. The player names one
       * playlist, and merging a second one in would extend the queue across
       * playlists, which is the thing the queue is built to avoid.
       */
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
       * The current track and the offset do not move. The one case that does move
       * something is the current track itself leaving the source: there is then no
       * track to be on, so the offset resets and the queue stops. Whether playback
       * then advances is decided elsewhere; this store only refuses to keep a
       * cursor pointing at nothing.
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
       * entry that now occupies its place, which is the next one. There is none
       * when it was the last entry: the queue is spent and stops, the same
       * answer the end of the queue gives, rather than leaving the cursor on a
       * track that is gone.
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

      /*
       * A press inside the grace window is "step back", which the first track
       * cannot do. Anywhere else, past the window or at the start of the queue,
       * the track restarts where it stands, and `seekTo` carries the jump so the
       * element moves even though the current id does not change. Either way the
       * transport resumes, because reaching for next or previous is a play
       * gesture and not a way to move a paused cursor.
       */
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
       * The end of the queue stops rather than wrapping. There is no next track, so
       * the playhead returns to the start of the last one and playback stops, which
       * is what "finish the album" means and is not the same as "skip at the end",
       * which does nothing.
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

      /*
       * Shuffle reorders the queue in place and its answer is the queue itself.
       * Turning it on draws a new arrangement and a new start: a random entry
       * leads, the rest scatter behind it, and the playhead moves to that entry,
       * because the press asked for a fresh shuffle rather than a re-arrangement
       * around the track already playing. Turning it off puts the queue back in
       * the playlist's own order and leaves the playhead where it stands, which
       * is why that order is kept beside the queue.
       */
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
