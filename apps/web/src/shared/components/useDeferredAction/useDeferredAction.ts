import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * The deferred-action window. Pressing a destructive control does not call the
 * server; it opens this window, and the call the caller passed runs only when the
 * window closes on its own. Cancelling closes the window early and the call never
 * happens, which is what makes Cancel honest rather than a compensating write.
 *
 * There is one window at a time: opening a new one replaces whatever was pending.
 * A second delete does not silently fire the first one behind the listener's back,
 * which would be a call they thought they had cancelled. Replacing is the only
 * safe reading, and the toast shows whichever window is current.
 *
 * Replacing is safe but not invisible: the hook reports the action the new window
 * displaced as `replaced`, so the surface can name the intent that was dropped
 * rather than swapping the toast without a word. A repeated press of the same
 * action is the same intent and reports nothing. `windowId` marks the window
 * itself, so a surface can restart with each one rather than letting a countdown
 * or an entrance animation outlive the window it was drawn for.
 *
 * The window is a timer, and the timer's timeout is the same duration the toast
 * draws its ring against, so the two cannot drift. The timer is not an
 * `animationend`, for the same reason the dialogs use a timer: a suppressed
 * animation never fires, and a deferred call that only ran on an animation would
 * never run at all.
 */

/** How long a deferred destructive action waits before it fires. */
export const UNDO_WINDOW_MS = 6000;

export interface PendingAction {
  /**
   * The subject's id: the playlist or the track the action is about. A surface
   * matches its target by this id and not by `detail`, because `detail` is a name
   * and two playlists can share one.
   */
  readonly id: string;
  /** The sentence the toast shows, in the present tense, e.g. `Deleting “Evening Jazz”`. */
  readonly message: string;
  /** The line under it, e.g. the playlist or track name. */
  readonly detail: string | null;
  /** The work to run when the window closes without a cancel. */
  readonly commit: () => void;
}

export interface DeferredAction {
  readonly pending: PendingAction | null;
  /**
   * The action the current window displaced, until the window ends. Null on the
   * first window and when the same action is deferred twice.
   */
  readonly replaced: PendingAction | null;
  /** The ordinal of the current window, so a surface can restart with it. */
  readonly windowId: number;
  /** Open a window for `action`, replacing any window already open. */
  readonly defer: (action: PendingAction) => void;
  /** Close the window without running its commit. */
  readonly cancel: () => void;
}

interface Windows {
  readonly pending: PendingAction | null;
  readonly replaced: PendingAction | null;
  readonly windowId: number;
}

const NO_WINDOW: Windows = { pending: null, replaced: null, windowId: 0 };

/** Two windows for the same subject and sentence are one intent, not a replacement. */
function sameIntent(a: PendingAction, b: PendingAction): boolean {
  return a.id === b.id && a.message === b.message && a.detail === b.detail;
}

export function useDeferredAction(durationMs = UNDO_WINDOW_MS): DeferredAction {
  const [windows, setWindows] = useState<Windows>(NO_WINDOW);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback((): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  /*
   * Closing keeps the counter: the window that just ended is not the window that
   * opened before it, and a reused id would restart a surface that had already
   * moved on. Only the pending and displaced actions go.
   */
  const close = useCallback((): void => {
    setWindows(current => ({ ...current, pending: null, replaced: null }));
  }, []);

  const defer = useCallback(
    (action: PendingAction): void => {
      clear();
      setWindows(current => ({
        pending: action,
        replaced:
          current.pending !== null && !sameIntent(current.pending, action)
            ? current.pending
            : null,
        windowId: current.windowId + 1
      }));
      timer.current = setTimeout(() => {
        timer.current = null;
        close();
        action.commit();
      }, durationMs);
    },
    [clear, close, durationMs]
  );

  const cancel = useCallback((): void => {
    clear();
    close();
  }, [clear, close]);

  /* A window that is open when the surface unmounts is a call that never runs. */
  useEffect(() => clear, [clear]);

  return {
    pending: windows.pending,
    replaced: windows.replaced,
    windowId: windows.windowId,
    defer,
    cancel
  };
}
