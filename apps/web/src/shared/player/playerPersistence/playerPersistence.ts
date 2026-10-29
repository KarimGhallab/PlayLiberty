import type { PersistedPlayerState, PlayerState, PlayerTrack } from '../types';

export const PLAYER_STORAGE_KEY = 'playliberty.player';

/** The store slice persisted, without `isPlaying` or `seekTo`. */
function persistedSlice(state: PlayerState): PersistedPlayerState {
  return {
    sourceQueue: state.sourceQueue,
    /* Only a shuffle needs its own copy of the order: the source is the other. */
    orderIds: state.shuffle ? state.queue.map(track => track.id) : [],
    shuffle: state.shuffle,
    currentId: state.currentId,
    positionSeconds: state.positionSeconds,
    volume: state.volume
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isPlayerTrack(value: unknown): value is PlayerTrack {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const {
    id,
    title,
    playlistId,
    playlistName,
    durationSeconds,
    thumbnailPath
  } = value as {
    id: unknown;
    title: unknown;
    playlistId: unknown;
    playlistName: unknown;
    durationSeconds: unknown;
    thumbnailPath: unknown;
  };

  return (
    typeof id === 'string' &&
    typeof title === 'string' &&
    (playlistId === null || typeof playlistId === 'string') &&
    (playlistName === null || typeof playlistName === 'string') &&
    (durationSeconds === null || typeof durationSeconds === 'number') &&
    (thumbnailPath === null || typeof thumbnailPath === 'string')
  );
}

/*
 * The payload as a real state, or null. `volume` defaults, and a payload from
 * before `sourceQueue` reads its `queue` as the source order.
 */
function parsePersistedPlayerState(
  value: unknown
): PersistedPlayerState | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const stored = value as Record<string, unknown>;
  const sourceQueue =
    'sourceQueue' in stored ? stored.sourceQueue : stored.queue;

  if (!Array.isArray(sourceQueue) || !sourceQueue.every(isPlayerTrack)) {
    return null;
  }

  if (!('currentId' in stored) || !('positionSeconds' in stored)) {
    return null;
  }

  const { currentId, positionSeconds } = stored;

  if (currentId !== null && typeof currentId !== 'string') {
    return null;
  }

  if (typeof positionSeconds !== 'number') {
    return null;
  }

  const rawVolume = 'volume' in stored ? stored.volume : 1;

  if (typeof rawVolume !== 'number') {
    return null;
  }

  const rawShuffle = 'shuffle' in stored ? stored.shuffle : false;

  if (typeof rawShuffle !== 'boolean') {
    return null;
  }

  /* A payload written before the shuffle was kept has no order of its own. */
  const rawOrderIds = 'orderIds' in stored ? stored.orderIds : [];

  if (!isStringArray(rawOrderIds)) {
    return null;
  }

  return {
    sourceQueue,
    orderIds: rawOrderIds,
    shuffle: rawShuffle,
    currentId,
    positionSeconds,
    volume: rawVolume
  };
}

export function readPlayerState(storage: Storage): PersistedPlayerState | null {
  const raw = storage.getItem(PLAYER_STORAGE_KEY);

  if (raw === null) {
    return null;
  }

  try {
    return parsePersistedPlayerState(JSON.parse(raw));
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
 * Hydrate once, then write on a throttle and flush on `pagehide`/tab-hidden: a
 * pending write when the page goes is a queue lost. No autoplay.
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
