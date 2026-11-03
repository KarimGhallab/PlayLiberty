# 15: The undo window can be extended

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

A deferred delete and a deferred track removal give the user one six-second window with an Undo control. Nothing
pauses or extends the countdown. A screen-reader user navigating to the snackbar can miss it, and the delete then
commits with no recovery.

## Expected

The user can pause or extend the window before it commits, by holding the snackbar or through an accessibility action.
The deferred request still commits when the window truly ends.

## Evidence

- `apps/mobile/src/shared/components/UndoSnackbar/UndoSnackbar.tsx`: one `Animated.timing` from 1 to 0 over
  `durationMs`.
- `UNDO_WINDOW_MS` in the playlist actions module.

## Acceptance criteria

- [x] Holding the snackbar, or an accessibility action on it, pauses the countdown and keeps the action pending.
- [x] Releasing resumes, and the request commits at the real end of the window.
- [x] The countdown's remaining bar reflects the pause.
- [x] Undo still cancels the request and restores the row.

## Outcome

The snackbar now owns the window. It starts the timeout and the remaining bar together, calls `onExpire` when the
timeout ends, and stops both when it unmounts. Holding the surface (touch start) pauses the timeout and freezes the
bar; releasing resumes from the remaining time. The body exposes a "More time" accessibility action that adds five
seconds and restarts the bar, so a screen-reader user can keep the request pending without a hold.

The detail and the gallery no longer own a timer: they pass `onExpire` and keep their pending state until the snackbar
commits or Undo clears it. The detail's delete guard still sees `pendingDelete` for the whole window, and a second
deferred action still commits the first before opening its own window.

The suite proves the hold and the extension with short real windows, and Undo still reports without waiting. The
Maestro `detail-remove-undo` flow passes on the emulator.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. A fake-timer test proves the extension, and the Maestro `detail-remove-undo` flow passes.
