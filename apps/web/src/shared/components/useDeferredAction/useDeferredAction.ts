import { useCallback, useSyncExternalStore } from 'react';

import { deferredActions } from './deferredActionStore';
import type { DeferredAction, PendingAction } from './types';

/*
 * The windows are module-level, so a route change keeps them alive; the hook
 * only subscribes a surface and hands it the two commands.
 */

export const UNDO_WINDOW_MS = 6000;

export function useDeferredAction(durationMs = UNDO_WINDOW_MS): DeferredAction {
  const windows = useSyncExternalStore(
    deferredActions.subscribe,
    deferredActions.getSnapshot,
    deferredActions.getSnapshot
  );

  const defer = useCallback(
    (action: PendingAction): void => {
      deferredActions.defer(action, durationMs);
    },
    [durationMs]
  );

  const cancel = useCallback((key: number): void => {
    deferredActions.cancel(key);
  }, []);

  return { windows, defer, cancel };
}
