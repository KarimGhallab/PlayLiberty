import { create } from 'zustand';

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

export interface PlayerState {
  /* The order being played: the playlist's own, or a shuffle of it. */
  readonly queue: readonly string[];
  /* The playlist's own order, so turning shuffle off restores it. */
  readonly sourceQueue: readonly string[];
  readonly playlistId: string | null;
  readonly currentId: string | null;
  readonly shuffle: boolean;
  start: (
    queue: readonly string[],
    playlistId: string | null,
    currentId: string,
    shuffle?: boolean
  ) => void;
  setShuffle: (shuffle: boolean) => void;
  play: (trackId: string) => void;
  advance: () => void;
  drop: (trackId: string) => void;
  clear: () => void;
}

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  queue: [],
  sourceQueue: [],
  playlistId: null,
  currentId: null,
  shuffle: false,
  start: (queue, playlistId, currentId, shuffle = false) =>
    set({
      queue: shuffle ? shuffledWithLeader(queue, currentId) : queue,
      sourceQueue: queue,
      playlistId,
      currentId,
      shuffle
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
        currentId: leader
      };
    }),
  play: trackId =>
    set(state =>
      state.queue.includes(trackId) ? { currentId: trackId } : state
    ),
  advance: () => {
    const { queue, currentId } = get();
    const index = currentId === null ? -1 : queue.indexOf(currentId);

    set({ currentId: queue[index + 1] ?? null });
  },
  drop: trackId => {
    const { queue, sourceQueue, currentId } = get();
    const index = queue.indexOf(trackId);

    if (index < 0) {
      return;
    }

    const nextQueue = queue.filter(id => id !== trackId);
    const nextSource = sourceQueue.filter(id => id !== trackId);

    if (currentId !== trackId) {
      set({ queue: nextQueue, sourceQueue: nextSource });
      return;
    }

    // A dropped current track advances; if it was the last one the queue ends.
    set({
      queue: nextQueue,
      sourceQueue: nextSource,
      currentId: nextQueue[index] ?? null
    });
  },
  clear: () =>
    set({
      queue: [],
      sourceQueue: [],
      playlistId: null,
      currentId: null,
      shuffle: false
    })
}));
