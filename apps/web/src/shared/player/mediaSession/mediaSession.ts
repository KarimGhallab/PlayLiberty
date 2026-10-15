/*
 * The browser's media controls, driven from the player state.
 *
 * The Media Session API is absent in some engines and throws on a handler the
 * engine does not know, so every call here is feature-detected and swallowed:
 * the guarantee this module makes is that a browser without the controls loses
 * the controls and nothing else. Nothing in it may throw past the player.
 */

export interface SessionMetadata {
  readonly title: string;
  readonly artist: string;
  readonly album: string;
  readonly artwork: readonly { readonly src: string }[];
}

/** The actions the player answers, wired to the same store as the rest of it. */
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
   * Presence is not enough: a stub or a partial implementation can carry the key
   * with nothing under it, and `setActionHandler` is what this module actually
   * needs. Checking the shape rather than the key is what makes the absent case
   * one code path instead of two.
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

/**
 * Publish the current track to the controls. A null clears them, which is what
 * the end of the queue looks like from the outside.
 */
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

/**
 * Route the controls into the player and return the teardown. Each handler is
 * registered inside its own try, because an engine that rejects one action must
 * still get the others rather than losing the whole session to a single throw.
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
