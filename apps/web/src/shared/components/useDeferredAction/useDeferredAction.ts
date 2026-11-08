import { useCallback, useSyncExternalStore } from 'react';

import {
  UNDO_WINDOW_MS,
  deferredActions
} from '@playliberty/library';
import type {
  DeferOptions,
  DeferredAction,
  PendingAction
} from '@playliberty/library';

/*
 * The windows are module-level, so a route change keeps them alive; the hook
 * only subscribes a surface and hands it the commands.
 */

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
