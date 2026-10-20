/*
 * Browser media controls, from the player state. The API is absent or throws in
 * some engines, so each call is feature-detected, swallowed: a browser without
 * the controls loses them and nothing else.
 */

export interface SessionMetadata {
  readonly title: string;
  readonly artist: string;
  readonly album: string;
  readonly artwork: readonly { readonly src: string }[];
}

/** The actions the player answers, wired to the same store as the rest. */
export interface SessionHandlers {
  readonly onPlay: () => void;
  readonly onPause: () => void;
  readonly onNextTrack: () => void;
  readonly onPreviousTrack: () => void;
  readonly onSeekBackward: () => void;
  readonly onSeekForward: () => void;
}

type MediaSessionLike = {
  metadata: unknown;
  setActionHandler: (action: string, handler: (() => void) | null) => void;
};

const HANDLED_ACTIONS = [
  'play',
  'pause',
  'nexttrack',
  'previoustrack',
  'seekbackward',
  'seekforward'
] as const;

function getSession(): MediaSessionLike | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  /*
   * Presence is not enough: a stub can carry the key with nothing under it, so
   * check the shape (`setActionHandler`), which makes the absent case one path.
   */
  const session = (navigator as { mediaSession?: MediaSessionLike })
    .mediaSession;

  if (
    session === null ||
    session === undefined ||
    typeof session.setActionHandler !== 'function'
  ) {
    return null;
  }

  return session;
}

/** Publish the track to the controls; null clears them (end of queue). */
export function publishMetadata(metadata: SessionMetadata | null): void {
  const session = getSession();

  if (session === null) {
    return;
  }

  try {
    if (metadata === null || typeof MediaMetadata === 'undefined') {
      session.metadata = null;
      return;
    }

    session.metadata = new MediaMetadata({
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      artwork: metadata.artwork.map(entry => ({ src: entry.src }))
    });
  } catch {
    // Metadata is a nicety; playback does not depend on it.
  }
}

/*
 * Route the controls into the player and return the teardown. Each handler has
 * its own try, so an engine rejecting one action still gets the others.
 */
export function bindSessionHandlers(handlers: SessionHandlers): () => void {
  const session = getSession();

  if (session === null) {
    return () => undefined;
  }

  const actionHandlers: Record<string, () => void> = {
    play: handlers.onPlay,
    pause: handlers.onPause,
    nexttrack: handlers.onNextTrack,
    previoustrack: handlers.onPreviousTrack,
    seekbackward: handlers.onSeekBackward,
    seekforward: handlers.onSeekForward
  };

  for (const action of HANDLED_ACTIONS) {
    try {
      session.setActionHandler(action, actionHandlers[action]);
    } catch {
      // An engine that does not know the action simply does not offer it.
    }
  }

  return () => {
    for (const action of HANDLED_ACTIONS) {
      try {
        session.setActionHandler(action, null);
      } catch {
        // Nothing to release when the action was never registered.
      }
    }
  };
}
