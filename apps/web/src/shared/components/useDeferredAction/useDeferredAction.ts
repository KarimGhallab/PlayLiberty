import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * The deferred-action window: the call runs only when the window closes on its
 * own, one window at a time, and opening a new one replaces what was pending
 * rather than firing it. The timer ends it, not `animationend`.
 */

export const UNDO_WINDOW_MS = 6000;

export interface PendingAction {
  /**
   * The subject's id: a surface matches its target by this and not by `detail`,
   * because `detail` is a name and two playlists can share one.
   */
  readonly id: string;
  /** The sentence the toast shows, in the present tense, e.g. `Deleting “Evening Jazz”`. */
  readonly message: string;
  readonly detail: string | null;
  readonly commit: () => void;
}

export interface DeferredAction {
  readonly pending: PendingAction | null;
  /**
   * The action the current window displaced, until the window ends; null on the
   * first window and when the same action is deferred twice.
   */
  readonly replaced: PendingAction | null;
  readonly windowId: number;
  readonly defer: (action: PendingAction) => void;
  readonly cancel: () => void;
}

interface Windows {
  readonly pending: PendingAction | null;
  readonly replaced: PendingAction | null;
  readonly windowId: number;
}

const NO_WINDOW: Windows = { pending: null, replaced: null, windowId: 0 };

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

  /* Closing keeps the counter: a reused id would restart a surface that had
   * already moved on, so only the pending and displaced actions go. */
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
