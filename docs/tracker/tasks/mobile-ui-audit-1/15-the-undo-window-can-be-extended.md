# 15: The undo window can be extended

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

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
