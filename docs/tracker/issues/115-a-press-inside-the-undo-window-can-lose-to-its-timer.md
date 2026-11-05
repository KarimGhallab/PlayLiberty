# 115: A press inside the undo window can lose to its timer

**State:** `resolved`
**Category:** `bug`

## Outcome

The window is now decided on the clock the gesture carries. A React Native touch event's `nativeEvent.timestamp` and `performance.now()` are both the same monotonic millisecond clock (RN converts Android's uptime to a `HighResTimeStamp`), so `UndoSnackbar` keeps a deadline in that clock, records the touch start, and calls `onUndo` only when the gesture began at or before the deadline. A keyboard or screen-reader activation, which has no touch start, is measured with the current clock.

The deferred action outlives the state the expire callback used to clear. `PlaylistDetail` keeps it in `pendingRef`, and `undoPending` resolves that ref rather than the `pending` state. On expiry the snackbar stays mounted and the commit is scheduled 150 ms later (`COMMIT_GRACE_MS`), so a press already queued when the timer fired can still reach the bar, cancel the scheduled commit and restore the row. A press that began after the deadline is refused and the commit proceeds. The grace timer checks that the action it was scheduled for is still the current one, so a commit and an undo cannot both happen for the same action. The bar is visible for those 150 ms beyond the countdown; a press outside the clock window is still refused.

Verification: an `UndoSnackbar` test expires the window, then presses with a touch start captured inside it, and `onUndo` fires; a second test presses with a touch start after the deadline and it does not. A `PlaylistDetail` test advances the window to expiry, presses with the inside timestamp, finds the row restored, and finds no removal after the grace; a second advances to expiry and presses with an outside timestamp, then finds the removal committed and the bar gone. The detail suite (115), the snackbar suite (5) and `pnpm test:unit` (614 mobile) pass, as do `pnpm run lint:check` and `pnpm run build`. The full e2e batch was not rerun.
