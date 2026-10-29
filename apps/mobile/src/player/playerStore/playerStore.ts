import { create } from 'zustand';

/* The queue is client state and never reaches the server. It holds track ids,
 * so a stream address is derived when a track is reached. */

export interface PlayerState {
  readonly queue: readonly string[];
  readonly playlistId: string | null;
  readonly currentId: string | null;
  start: (
    queue: readonly string[],
    playlistId: string | null,
    currentId: string
  ) => void;
  advance: () => void;
  drop: (trackId: string) => void;
  clear: () => void;
}

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  queue: [],
  playlistId: null,
  currentId: null,
  start: (queue, playlistId, currentId) =>
    set({ queue, playlistId, currentId }),
  advance: () => {
    const { queue, currentId } = get();
    const index = currentId === null ? -1 : queue.indexOf(currentId);

    set({ currentId: queue[index + 1] ?? null });
  },
  drop: trackId => {
    const { queue, currentId } = get();
    const index = queue.indexOf(trackId);

    if (index < 0) {
      return;
    }

    const nextQueue = queue.filter(id => id !== trackId);

    if (currentId !== trackId) {
      set({ queue: nextQueue });
      return;
    }

    // A dropped current track advances; if it was the last one the queue ends.
    set({ queue: nextQueue, currentId: nextQueue[index] ?? null });
  },
  clear: () => set({ queue: [], playlistId: null, currentId: null })
}));
