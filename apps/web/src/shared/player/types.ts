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
  /*
   * Whether the queue is shuffled. It is a client fact like the queue itself,
   * never persisted: a relaunch starts on the stored order, and turning it off
   * keeps the order the shuffle left because there is no original to restore.
   */
  readonly shuffle: boolean;
  readonly muted: boolean;
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
   * Transport. `skipNext` moves one place and does nothing at the end rather
   * than wrapping. `skipPrevious` steps back only inside a small grace window;
   * after it, the press restarts the current track, and the first track restarts
   * because there is nowhere to step back to. Both are play gestures and resume a
   * paused queue rather than moving the cursor on a stopped one. `advance` is what
   * a finished track does, which is the same move as `skipNext` and a different
   * answer at the last track, where it stops.
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
export function currentIndex(state: PersistedPlayerState): number {
  if (state.currentId === null) {
    return -1;
  }

  return state.queue.findIndex(track => track.id === state.currentId);
}

/*
 * The index the queue moves to after the current track, or -1 when there is
 * none. Shuffled, it is any of the other tracks at random and there is always
 * one whenever the queue holds more than the current track; unshuffled, it is
 * the next place and is absent at the end. This is the one place the two
 * answers to "what comes next" are decided, so the forward step and the end of
 * a track cannot disagree about the end of the queue.
 */
export function nextIndex(state: PlayerState): number {
  const index = currentIndex(state);

  if (index < 0 || state.queue.length <= 1) {
    return -1;
  }

  if (!state.shuffle) {
    return index + 1 < state.queue.length ? index + 1 : -1;
  }

  const others = state.queue
    .map((_track, other) => other)
    .filter(other => other !== index);

  return others[Math.floor(Math.random() * others.length)];
}
