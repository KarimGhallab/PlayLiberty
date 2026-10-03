/*
 * The player state, shared by the store, the persistence and the components.
 *
 * The queue is client state that never reaches the database. It carries the
 * minimum a bar needs to render, and it names the playlist it was built from so
 * the surface can say where the music is coming from.
 */

/** One entry in the play queue, as the bar and the audio element need it. */
export interface PlayerTrack {
  readonly id: string;
  readonly title: string;
  readonly playlistId: string;
  readonly durationSeconds: number | null;
  readonly thumbnailPath: string | null;
}

/*
 * The part of the player that survives a reload. `isPlaying` is never persisted,
 * so a relaunch never starts audio on its own.
 *
 * The current track is held as an id and not as an index. The queue is re-ordered
 * by a refetch merging by id, and a drop shifts every index after it; an index
 * that survived a reload would point at the wrong track the moment the queue
 * changed, while an id points at the same track or at nothing. The index a caller
 * wants is derived from the id against the queue.
 */
export interface PersistedPlayerState {
  readonly queue: readonly PlayerTrack[];
  readonly currentId: string | null;
  readonly positionSeconds: number;
}

export interface PlayerState extends PersistedPlayerState {
  readonly isPlaying: boolean;
  readonly hydrate: (state: PersistedPlayerState) => void;
  readonly startQueue: (
    playlistId: string,
    tracks: readonly PlayerTrack[],
    startTrackId: string
  ) => void;
  readonly applyRefetch: (
    playlistId: string,
    tracks: readonly PlayerTrack[]
  ) => void;
  readonly play: (id: string) => void;
  readonly remove: (id: string) => void;
  readonly setPosition: (seconds: number) => void;
  readonly setPlaying: (playing: boolean) => void;
  readonly clear: () => void;
}

/** The index of the current track, or -1 when nothing is current. */
export function currentIndex(state: PersistedPlayerState): number {
  if (state.currentId === null) {
    return -1;
  }

  return state.queue.findIndex(track => track.id === state.currentId);
}
