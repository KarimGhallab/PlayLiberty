# 71: The undo window commits one action and drops the rest

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** The deferred-action window holds one pending action in one slot. A second deferral replaces the first without committing it, unmounting the surface cancels the only timer, and the toast replaces its predecessor instead of stacking.

**Current behavior:**
`useDeferredAction.ts` keeps `{ pending, replaced, windowId }`. `defer` clears the running timer and overwrites `pending`; the displaced action is kept only as `replaced` for the toast copy, and `close` drops it without committing. `useEffect(() => clear, [clear])` (line 96) clears the timer on unmount. So deleting playlist A and then playlist B inside the 6s window never commits A and replaces A's toast, and deleting A then navigating away never commits A while the toast unmounts silently.

**Desired behavior:**
Every deferral owns its own window and commits unless it is cancelled; a new deferral does not cancel an older one. The toasts stack, the newer pushing the older up, and each keeps its own Cancel for its own remaining time. A window that is open when its surface unmounts still commits.

**Key interfaces:**

- `useDeferredAction` returns the open windows, not one `pending`.
- `UndoToast` renders one toast per window; the existing class and copy stay.
- The window list survives a route change (a module-level store or a provider above the routes).

**Acceptance criteria:**

- [ ] Deleting two items inside the window commits both when neither is cancelled.
- [ ] Cancelling one toast leaves the other open and its commit running.
- [ ] Navigating away inside the window still commits the action.
- [ ] Both toasts are visible at once, the newer above the older.
- [ ] A test holds the two-deletions case and the unmount case.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The mutation payloads and the server side of delete and remove.
- The toast's visual design beyond stacking.

## Observed

- Delete a playlist, delete a second one within 6s: only the second commits; the first is silently kept.
- Delete a playlist, open another one within 6s: the toast disappears and the delete never commits.
- The second toast replaces the first instead of appearing beside it.

## Expected

- Each deferred action commits on its own window, and every open window is visible until it ends.

## Evidence

- `apps/web/src/shared/components/useDeferredAction/useDeferredAction.ts:74-96`.
- `apps/web/src/shared/components/UndoToast/UndoToast.tsx`.
- Impeccable critique of `apps/web`, 2026-10-19, priority issue P1; second scenario reported by the maintainer during triage.
