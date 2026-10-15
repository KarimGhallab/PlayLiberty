/*
 * The player state, shared by the store, the persistence and the components. The
 * queue is client state that never reaches the database, and it names the
 * playlist it was built from so the surface can say where the music is coming
 * from.
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
 * The stored order is the playlist's own and not the order the listener last
 * heard. The playback order is derived from it on hydrate, so a relaunch starts
 * on the source order, and the order a shuffle replaced is kept, which is what
 * turning shuffle off restores.
 *
 * The current track is held as an id and not as an index. The queue is re-ordered
 * by a refetch merging by id, and a drop shifts every index after it; an index
 * that survived a reload would point at the wrong track the moment the queue
 * changed, while an id points at the same track or at nothing. The index a caller
 * wants is derived from the id against the queue.
 */
export interface PersistedPlayerState {
  readonly sourceQueue: readonly PlayerTrack[];
  readonly currentId: string | null;
  readonly positionSeconds: number;
  readonly volume: number;
}

export interface PlayerState {
  /** The playback order: what the transport steps through and the list draws. */
  readonly queue: readonly PlayerTrack[];
  /*
   * The playlist's own order, the order the queue was built in. Kept in step
   * with every change to `queue`, so turning shuffle off restores an order
   * somebody chose rather than the order the shuffle happened to leave.
   */
  readonly sourceQueue: readonly PlayerTrack[];
  readonly currentId: string | null;
  readonly positionSeconds: number;
  readonly volume: number;
  readonly isPlaying: boolean;
  readonly seekTo: number | null;
  /*
   * Whether the queue is shuffled. It is a client fact like the queue itself and
   * never persisted: a relaunch starts on the source order, and turning it off
   * puts the queue back in that order.
   */
  readonly shuffle: boolean;
  readonly muted: boolean;
  readonly hydrate: (state: PersistedPlayerState) => void;
  /*
   * Build the queue from one playlist and start on `startTrackId`. `shuffle` is
   * the mode the new queue is drawn in and is spent on its order at once: a
   * shuffled queue is a new arrangement that then plays front to back, so it is
   * the caller's current mode being carried over and not a per-step coin toss.
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
   * A track that cannot be played, removed from the queue. When it is the
   * current track, the one that follows it becomes current and playback
   * continues; at the end there is nothing to continue to, so the queue stops.
   * When it is not current, it is only removed.
   */
  readonly dropAndAdvance: (id: string) => void;
  /*
   * Transport. `skipNext` moves one place and does nothing at the end rather
   * than wrapping, over the queue as it stands: a shuffled queue is walked like
   * any other, and this is not a second shuffle. `skipPrevious` steps back only
   * inside a small grace window; after it, the press restarts the current track,
   * and the first track restarts because there is nowhere to step back to. Both
   * are play gestures and resume a paused queue rather than moving the cursor on
   * a stopped one. `advance` is what a finished track does, which is the same
   * move as `skipNext` and a different answer at the last track, where it stops.
   */
  readonly skipNext: () => void;
  readonly skipPrevious: () => void;
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
 * The index the queue moves to after the current track, or -1 when there is
 * none: the next place, and absent at the end. The randomness of a shuffle is
 * spent on the queue's order rather than on this answer, so a shuffled queue is
 * walked front to back like any other and stops at its last entry, the queue the
 * listener can already see being the one that plays. This is the one place "what
 * comes next" is decided, so the forward step and the end of a track cannot
 * disagree about the end of the queue.
 */
export function nextIndex(state: PlayerState): number {
  const index = currentIndex(state);

  if (index < 0) {
    return -1;
  }

  return index + 1 < state.queue.length ? index + 1 : -1;
}

/*
 * The playlist the queue is playing. The queue is built from one playlist, so the
 * first entry names it and an empty queue names none. The store's refetch guard
 * and every surface's "is this the queue?" ask this one question, so they cannot
 * disagree about which playlist is playing.
 */
export function queuePlaylistId(state: PlayerState): string | null {
  return state.queue[0]?.playlistId ?? null;
}

export function currentTrack(state: PlayerState): PlayerTrack | null {
  const index = currentIndex(state);

  return index < 0 ? null : state.queue[index];
}

/*
 * Whether the queue holds a track after the current one. The end-of-queue rule is
 * `nextIndex`'s, so the forward control of the bar and of the header cannot
 * disagree about the last track.
 */
export function hasNext(state: PlayerState): boolean {
  return nextIndex(state) >= 0;
}
