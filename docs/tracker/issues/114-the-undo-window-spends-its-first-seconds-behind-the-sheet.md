# 114: The undo window spends its first seconds behind the sheet

**State:** `resolved`
**Category:** `bug`

## Outcome

`Sheet` now reports the end of its exit. The prop `onExited` fires where the sheet unmounts, in both the reduced-motion branch and the animation's completion, and the ref carries the latest callback so it is not an effect dependency. `TrackActionsSheet` and `PlaylistActionsSheet` forward it.

`PlaylistDetail` starts a pending window closed when the action comes from a sheet: `startPending` takes `waitForSheet`, hides the row immediately as before, and sets `undoWindowOpen` false. The snackbar is not rendered until the sheet's `onExited` opens the window, so its timer starts on the first frame the bar is on screen. The notice's bottom offset follows the same gate. The gallery passes no `onExited` and keeps its behaviour, and the snackbar still owns its own timer.

Verification: a new `Sheet` test toggles a sheet closed and asserts `onExited` is not called while it is open, fires once, and the modal is gone. A new detail test turns reduced motion off, presses Remove, and asserts the track sheet is still on screen while `undo-snackbar` is absent, then waits for the sheet to leave and finds the bar. The full e2e batch was not rerun; the gain is structural, and the measured 2.5 to 2.9 s lost to the sheet no longer exists.
