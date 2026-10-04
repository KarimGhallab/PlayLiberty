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
 * The window is a timer, and the timer's timeout is the same duration the toast
 * draws its ring against, so the two cannot drift. The timer is not an
 * `animationend`, for the same reason the dialogs use a timer: a suppressed
 * animation never fires, and a deferred call that only ran on an animation would
 * never run at all.
 */

/** How long a deferred destructive action waits before it fires. */
export const UNDO_WINDOW_MS = 6000;

export interface PendingAction {
  /** The sentence the toast shows, e.g. `Deleted “Evening Jazz”`. */
  readonly message: string;
  /** The line under it, e.g. the playlist or track name. */
  readonly detail: string | null;
  /** The work to run when the window closes without a cancel. */
  readonly commit: () => void;
}

export interface DeferredAction {
  readonly pending: PendingAction | null;
  /** Open a window for `action`, replacing any window already open. */
  readonly defer: (action: PendingAction) => void;
  /** Close the window without running its commit. */
  readonly cancel: () => void;
}

export function useDeferredAction(durationMs = UNDO_WINDOW_MS): DeferredAction {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback((): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const defer = useCallback(
    (action: PendingAction): void => {
      clear();
      setPending(action);
      timer.current = setTimeout(() => {
        timer.current = null;
        setPending(null);
        action.commit();
      }, durationMs);
    },
    [clear, durationMs]
  );

  const cancel = useCallback((): void => {
    clear();
    setPending(null);
  }, [clear]);

  /* A window that is open when the surface unmounts is a call that never runs. */
  useEffect(() => clear, [clear]);

  return { pending, defer, cancel };
}
