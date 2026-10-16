/*
 * The player state, shared by the store, the persistence and the components.
 * The queue is client state that never reaches the database and names the
 * playlist it was built from.
 */

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
 * never persisted, so a relaunch never starts audio or jumps the playhead.
 */
export interface PersistedPlayerState {
  /* The playlist's own order, not the order last heard; the playback order is
   * derived from it on hydrate, so turning shuffle off restores it. */
  readonly sourceQueue: readonly PlayerTrack[];
  /* Held as an id, not an index: a refetch merges by id and a drop shifts every
   * index after it, so an index would point at the wrong track. */
  readonly currentId: string | null;
  readonly positionSeconds: number;
  readonly volume: number;
}

export interface PlayerState {
  /** Playback order: what the transport steps through and the list draws. */
  readonly queue: readonly PlayerTrack[];
  /* The playlist's own order, kept in step with every `queue` change so turning
   * shuffle off restores an order somebody chose. */
  readonly sourceQueue: readonly PlayerTrack[];
  readonly currentId: string | null;
  readonly positionSeconds: number;
  readonly volume: number;
  readonly isPlaying: boolean;
  readonly seekTo: number | null;
  /*
   * Whether the queue is shuffled: a client fact like the queue, never
   * persisted, so a relaunch starts on the source order.
   */
  readonly shuffle: boolean;
  readonly muted: boolean;
  readonly hydrate: (state: PersistedPlayerState) => void;
  /*
   * Build the queue and start on `startTrackId`. `shuffle` is spent on the
   * order at once: a shuffled queue plays front to back, not per-step.
   */
  readonly startQueue: (
    playlistId: string,
    tracks: readonly PlayerTrack[],
    startTrackId: string,
    shuffle?: boolean
  ) => void;
  readonly applyRefetch: (
    playlistId: string,
    tracks: readonly PlayerTrack[]
  ) => void;
  readonly play: (id: string) => void;
  readonly remove: (id: string) => void;
  /*
   * Remove a track that cannot be played. A current track continues on the one
   * after it, or stops at the end; a track that is not current is only removed.
   */
  readonly dropAndAdvance: (id: string) => void;
  /* Step one place forward over the queue as it stands, or nothing at the end
   * rather than wrapping; a shuffled queue is walked like any other. */
  readonly skipNext: () => void;
  /* Step back inside the grace window; past it or on the first track, restart
   * where it stands. Either way it resumes a paused queue. */
  readonly skipPrevious: () => void;
  /* A finished track: the same move as `skipNext`, but it stops at the last. */
  readonly advance: () => void;
  readonly seek: (seconds: number) => void;
  readonly setShuffle: (shuffle: boolean) => void;
  readonly clearSeek: () => void;
  readonly setPosition: (seconds: number) => void;
  readonly setPlaying: (playing: boolean) => void;
  readonly setVolume: (volume: number) => void;
  readonly setMuted: (muted: boolean) => void;
  readonly clear: () => void;
}

/** The index of the current track, or -1 when nothing is current. */
export function currentIndex(state: PlayerState): number {
  if (state.currentId === null) {
    return -1;
  }

  return state.queue.findIndex(track => track.id === state.currentId);
}

/*
 * The index after the current track, or -1 at the end: a shuffled queue is
 * walked front to back and stops at its last entry. Owns "what comes next".
 */
export function nextIndex(state: PlayerState): number {
  const index = currentIndex(state);

  if (index < 0) {
    return -1;
  }

  return index + 1 < state.queue.length ? index + 1 : -1;
}

/* The playlist the queue plays: the first entry names it, an empty queue names
 * none. Single owner, so the refetch guard and every surface agree. */
export function queuePlaylistId(state: PlayerState): string | null {
  return state.queue[0]?.playlistId ?? null;
}

export function currentTrack(state: PlayerState): PlayerTrack | null {
  const index = currentIndex(state);

  return index < 0 ? null : state.queue[index];
}

/* Whether a track follows the current one. The rule is `nextIndex`'s, so the
 * bar's and the header's forward controls agree about the last track. */
export function hasNext(state: PlayerState): boolean {
  return nextIndex(state) >= 0;
}
