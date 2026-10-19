/*
 * The deferred-action seam: a surface opens a window with a commit, and reads
 * back every open window so each toast can own its own cancel and countdown.
 */

export interface PendingAction {
  /** The subject's id, which a surface matches instead of the shared name. */
  readonly id: string;
  /** The sentence the toast shows, in the present tense. */
  readonly message: string;
  readonly detail: string | null;
  readonly commit: () => void;
}

/** One open window, as the toast surface reads it. */
export interface DeferredWindow {
  /** Stable identity for the list entry and its ring. */
  readonly key: number;
  readonly id: string;
  readonly message: string;
  readonly detail: string | null;
  /** When the window commits unless it is cancelled. */
  readonly expiresAt: number;
}

export interface DeferredAction {
  readonly windows: readonly DeferredWindow[];
  readonly defer: (action: PendingAction) => void;
  readonly cancel: (key: number) => void;
}
