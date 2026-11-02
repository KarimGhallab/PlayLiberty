# 15: The undo window can be extended

**Status:** ready-for-agent
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

- [ ] Holding the snackbar, or an accessibility action on it, pauses the countdown and keeps the action pending.
- [ ] Releasing resumes, and the request commits at the real end of the window.
- [ ] The countdown's remaining bar reflects the pause.
- [ ] Undo still cancels the request and restores the row.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. A fake-timer test proves the extension, and the Maestro `detail-remove-undo` flow passes.
