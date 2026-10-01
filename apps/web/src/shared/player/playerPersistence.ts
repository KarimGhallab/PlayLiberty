import type { PersistedPlayerState, PlayerState, PlayerTrack } from './types';

export const PLAYER_STORAGE_KEY = 'playliberty.player';

/** The slice of the store the persistence writes, without `isPlaying`. */
function persistedSlice(state: PlayerState): PersistedPlayerState {
  return {
    queue: state.queue,
    currentId: state.currentId,
    positionSeconds: state.positionSeconds
  };
}

function isPlayerTrack(value: unknown): value is PlayerTrack {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'title' in value &&
    typeof value.title === 'string'
  );
}

function isPersistedPlayerState(value: unknown): value is PersistedPlayerState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('queue' in value) || !Array.isArray(value.queue)) {
    return false;
  }

  if (!('currentId' in value) || !('positionSeconds' in value)) {
    return false;
  }

  const { currentId, positionSeconds } = value;

  return (
    value.queue.every(isPlayerTrack) &&
    (currentId === null || typeof currentId === 'string') &&
    typeof positionSeconds === 'number'
  );
}

/** The persisted player, or null when there is nothing usable stored. */
export function readPlayerState(storage: Storage): PersistedPlayerState | null {
  const raw = storage.getItem(PLAYER_STORAGE_KEY);

  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return isPersistedPlayerState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Write the persisted slice, ignoring a storage that refuses the write. */
export function writePlayerState(
  storage: Storage,
  state: PersistedPlayerState
): void {
  try {
    storage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private-mode and quota failures are not worth breaking playback over.
  }
}

function serialize(state: PlayerState): string {
  return JSON.stringify(persistedSlice(state));
}

/** The store surface the persistence needs, so a test can supply its own. */
export interface PlayerStoreApi {
  getState: () => PlayerState;
  subscribe: (listener: () => void) => () => void;
}

export interface PlayerPersistenceOptions {
  readonly store: PlayerStoreApi;
  readonly storage: Storage;
  readonly target: EventTarget;
  readonly document: Document;
  readonly throttleMs?: number;
}

/*
 * Hydrate once, then write the queue and position on a throttle, and flush on
 * `pagehide` and when the tab is hidden, because a throttled write that is still
 * pending when the page goes away is a queue the user loses. `isPlaying` is not
 * persisted, so a reload never starts audio on its own.
 */
export function attachPlayerPersistence(
  options: PlayerPersistenceOptions
): () => void {
  const { store, storage, target, document: doc, throttleMs = 1000 } = options;

  const persisted = readPlayerState(storage);

  if (persisted !== null) {
    store.getState().hydrate(persisted);
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastWritten = serialize(store.getState());

  const write = (): void => {
    const state = store.getState();
    lastWritten = serialize(state);
    writePlayerState(storage, persistedSlice(state));
  };

  const flush = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }

    write();
  };

  const schedule = (): void => {
    if (timer !== null) {
      return;
    }

    timer = setTimeout(flush, throttleMs);
  };

  const unsubscribe = store.subscribe(() => {
    const next = serialize(store.getState());

    if (next === lastWritten) {
      return;
    }

    schedule();
  });

  const onPageHide = (): void => flush();
  const onVisibilityChange = (): void => {
    if (doc.visibilityState === 'hidden') {
      flush();
    }
  };

  target.addEventListener('pagehide', onPageHide);
  doc.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    unsubscribe();
    target.removeEventListener('pagehide', onPageHide);
    doc.removeEventListener('visibilitychange', onVisibilityChange);

    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}
