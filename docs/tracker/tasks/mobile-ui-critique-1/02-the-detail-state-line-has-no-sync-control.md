# 02: The detail's state line has no sync control

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

The detail's meta row now carries a quiet sync cell after the state and time. `PlaylistIdentity` takes `onSync`; `PlaylistDetail` passes it only when `canWritePlaylist` holds, so the owner and a write collaborator see it and a reader does not. The control calls the same `syncFromDial` path as the dial, so a refusal lands in the header's problem slot rather than vanishing.

The cell is a borderless `surface` square with the sync glyph, 32dp at the wide header and 24dp compact. The state line stays text, so the action reads as its end rather than a field around it. The `header.sync` key supplies the accessible name "Sync, {playlist}", and the busy state is carried by `accessibilityState` and by disabling and dimming the control. The visible word is gone by the prototype decision; the 48dp target comes from the hit slop around the smaller box.

The row holds one line at 1.3. The wide header reads the state, the time and the cell on one line; the compact header drops the time and uses the 24dp cell, which leaves the owner line intact at 1.3.

The detail's actions sheet drops its sync row, because the state line carries it; the gallery card menu keeps Sync now, and the dial, the empty state and the failed band keep their own start. The menu no longer repeats the verb. Tests cover the owner's press and name, the write collaborator's control, its absence for a reader, and the disabled state while a run is live. The repo-wide lint is blocked by the unrelated untracked `apps/web/src/shared/components/PrototypeSwitcher/PrototypeSwitcher.tsx`, whose hardcoded copy predates this change.
