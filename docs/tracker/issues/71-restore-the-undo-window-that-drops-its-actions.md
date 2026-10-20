# 71: The undo window commits one action and drops the rest

**State:** `resolved`
**Category:** `bug`

## Outcome

The deferred-action store is module-level and owns one timer per window. `useDeferredAction` reads the open windows, `defer` adds one (a repeated press of the same intent refreshes it), and `cancel(key)` removes only that window. Leaving a surface no longer clears anything: each timer commits on its own, and the windows survive a remount or a route change.

`UndoToastStack` renders one `UndoToast` per window, newest first, so every window is visible and each Cancel removes only its own. The app renders the stack once above the routes, in `main.tsx`, so a route change keeps the toast surface alive; the library and detail pages read the same windows for their pending marks. The displaced copy (`replaced`, `windowId`, `replacedLabel`, `library.replaced`, `library.willNotDelete`) is gone.

Verification: `pnpm run build` and `pnpm run lint` pass; the web suite is 504 passed across 51 files; `pnpm test:e2e` is 35 passed. `useDeferredAction.test.ts` holds the two-window commit, the single-window cancel, the unmount commit and the remount case; `UndoToastStack.test.tsx` holds the stack order and the per-toast cancel; `LibraryPage.test.tsx` holds the two toasts.
