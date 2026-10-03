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
  readonly playlistName: string;
  readonly durationSeconds: number | null;
  readonly thumbnailPath: string | null;
}

/*
 * The part of the player that survives a reload. `isPlaying` and `seekTo` are
 * never persisted, so a relaunch never starts audio on its own and never jumps
 * the playhead on the first frame.
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
  readonly volume: number;
}

export interface PlayerState extends PersistedPlayerState {
  readonly isPlaying: boolean;
  readonly seekTo: number | null;
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
  /*
   * A track that cannot be played, removed from the queue. When it is the
   * current track, the one that follows it becomes current and playback
   * continues; at the end there is nothing to continue to, so the queue stops.
   * When it is not current, it is only removed.
   */
  readonly dropAndAdvance: (id: string) => void;
  /*
   * Transport. `skipNext` and `skipPrevious` move one place and do nothing at the
   * ends rather than wrapping; `advance` is what a finished track does, which is
   * the same move and a different answer at the last track, where it stops.
   */
  readonly skipNext: () => void;
  readonly skipPrevious: () => void;
  readonly advance: () => void;
  readonly seek: (seconds: number) => void;
  readonly clearSeek: () => void;
  readonly setPosition: (seconds: number) => void;
  readonly setPlaying: (playing: boolean) => void;
  readonly setVolume: (volume: number) => void;
  readonly clear: () => void;
}

/** The index of the current track, or -1 when nothing is current. */
export function currentIndex(state: PersistedPlayerState): number {
  if (state.currentId === null) {
    return -1;
  }

  return state.queue.findIndex(track => track.id === state.currentId);
}
