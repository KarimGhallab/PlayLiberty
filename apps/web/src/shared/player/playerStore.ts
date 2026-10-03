import { create } from 'zustand';

import type { PersistedPlayerState, PlayerState, PlayerTrack } from './types';

/*
 * A refetch returns the server's order, which is not the order the queue was built
 * with. Known ids keep their sequence and new ids append in the server's order, so
 * a track arriving from a sync lands at the end rather than reshuffling the queue,
 * and a track the refetch no longer returns is gone. The current id survives
 * either way, which is the whole point: the music does not move under the listener.
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
  startQueue: (
    playlistId: string,
    tracks: readonly PlayerTrack[],
    startTrackId: string
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
          currentId: null,
          positionSeconds: 0,
          isPlaying: false
        };
      }

      return {
        queue,
        currentId: startTrackId,
        positionSeconds: 0,
        isPlaying: true
      };
    }),
  applyRefetch: (playlistId: string, tracks: readonly PlayerTrack[]) =>
    set(state => {
      /*
       * A refetch of another playlist is not this queue. The player names one
       * playlist, and merging a second one in would extend the queue across
       * playlists, which is the thing the queue is built to avoid.
       */
      if (state.queue.every(track => track.playlistId !== playlistId)) {
        return state;
      }

      const queue = mergeQueue(state.queue, tracks);
      const currentStillThere =
        state.currentId !== null &&
        queue.some(track => track.id === state.currentId);

      /*
       * The current track and the offset do not move. The one case that does move
       * something is the current track itself leaving the source: there is then no
       * track to be on, so the offset resets and the queue stops. Ticket 03 decides
       * whether playback then advances; this store only refuses to keep a cursor
       * pointing at nothing.
       */
      if (!currentStillThere) {
        return { queue, currentId: null, positionSeconds: 0, isPlaying: false };
      }

      return { queue };
    }),
  play: (id: string) =>
    set(state => {
      if (!state.queue.some(track => track.id === id)) {
        return state;
      }

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
  setPosition: (seconds: number) => set({ positionSeconds: seconds }),
  setPlaying: (playing: boolean) => set({ isPlaying: playing }),
  clear: () =>
    set({ queue: [], currentId: null, positionSeconds: 0, isPlaying: false })
}));
