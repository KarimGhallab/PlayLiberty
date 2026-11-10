import { useCallback, useSyncExternalStore } from 'react';

import { UNDO_WINDOW_MS, deferredActions } from '@playliberty/library';
import type {
  DeferOptions,
  DeferredAction,
  PendingAction
} from '@playliberty/library';

/* The windows live above every route, so a screen change keeps them alive. */
export function useDeferredAction(durationMs = UNDO_WINDOW_MS): DeferredAction {
  const windows = useSyncExternalStore(
    deferredActions.subscribe,
    deferredActions.getSnapshot,
    deferredActions.getSnapshot
  );

  const defer = useCallback(
    (action: PendingAction, options?: DeferOptions): number =>
      deferredActions.defer(action, durationMs, options),
    [durationMs]
  );
  const startAll = useCallback(() => deferredActions.startAll(), []);
  const cancel = useCallback((key: number) => deferredActions.cancel(key), []);
  const commit = useCallback((key: number) => deferredActions.commit(key), []);

  return { windows, defer, startAll, cancel, commit };
}
