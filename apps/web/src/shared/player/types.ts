/*
 * The player state, shared by the store, the persistence and the components.
 *
 * The queue is client state that never reaches the database. It carries the
 * minimum a bar needs to render; the real track shape belongs to the API client.
 */

/** One entry in the play queue, as the bar and the audio element need it. */
export interface PlayerTrack {
  readonly id: string;
  readonly title: string;
}

/** The part of the player that survives a reload. `isPlaying` is never persisted. */
export interface PersistedPlayerState {
  readonly queue: readonly PlayerTrack[];
  readonly currentId: string | null;
  readonly positionSeconds: number;
}

export interface PlayerState extends PersistedPlayerState {
  readonly isPlaying: boolean;
  readonly hydrate: (state: PersistedPlayerState) => void;
  readonly enqueue: (track: PlayerTrack) => void;
  readonly play: (id: string) => void;
  readonly remove: (id: string) => void;
  readonly replaceQueue: (tracks: readonly PlayerTrack[]) => void;
  readonly setPosition: (seconds: number) => void;
  readonly setPlaying: (playing: boolean) => void;
  readonly clear: () => void;
}
