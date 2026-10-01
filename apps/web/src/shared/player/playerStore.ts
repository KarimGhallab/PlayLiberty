import { create } from 'zustand';

import type { PersistedPlayerState, PlayerState, PlayerTrack } from './types';

/*
 * A refetch returns the server's order, which is not the order the user set.
 * Known ids keep the user's sequence and new ids append in the server's order,
 * so a track arriving from a sync lands at the end rather than reshuffling the
 * queue. The current id survives either way.
 */
function mergeQueue(
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

export const usePlayerStore = create<PlayerState>()(set => ({
  queue: [],
  currentId: null,
  positionSeconds: 0,
  isPlaying: false,
  hydrate: (state: PersistedPlayerState) =>
    set({
      queue: [...state.queue],
      currentId: state.currentId,
      positionSeconds: state.positionSeconds
    }),
  enqueue: (track: PlayerTrack) =>
    set(state =>
      state.queue.some(queued => queued.id === track.id)
        ? state
        : { queue: [...state.queue, track] }
    ),
  play: (id: string) =>
    set(state => {
      if (state.currentId === id) {
        return { isPlaying: true };
      }

      return { currentId: id, positionSeconds: 0, isPlaying: true };
    }),
  remove: (id: string) =>
    set(state => {
      const queue = state.queue.filter(track => track.id !== id);

      if (state.currentId !== id) {
        return { queue };
      }

      return { queue, currentId: null, positionSeconds: 0, isPlaying: false };
    }),
  replaceQueue: (tracks: readonly PlayerTrack[]) =>
    set(state => ({ queue: mergeQueue(state.queue, tracks) })),
  setPosition: (seconds: number) => set({ positionSeconds: seconds }),
  setPlaying: (playing: boolean) => set({ isPlaying: playing }),
  clear: () =>
    set({ queue: [], currentId: null, positionSeconds: 0, isPlaying: false })
}));
