# 02: The detail's state line has no sync control

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The detail's identity block draws the sync state and its relative time as text and nothing else
(`PlaylistIdentity.tsx` builds `state`, `stateColor` and `time` from `syncStateLabel`, `syncStateColor` and
`formatLastSynced`). Sync is reachable only from the actions sheet, as its fourth row, or from the library's dial as a
second press. On the device the meta row reads "Up to date · Synced yesterday" with no control beside it.

## Expected

`docs/DESIGN.md`, section "The mobile client": "On the detail, the state line carries a named sync control on its own
bordered surface, so the recurring action is one press from the health it changes and the cover behind it cannot
swallow it", and "A phone trims the way home to Back and the playlist's sync to Sync, so that row holds one line."

## Evidence

- `docs/DESIGN.md`, "The settled arrangements", "The playlist header is three arrangements": the sentence quoted
  above.
- `apps/mobile/src/views/playlist/PlaylistIdentity/PlaylistIdentity.tsx`: the meta block renders `time` and `state`
  only.
- The 2026-11-03 critique screenshots, detail at the top and scrolled: a playlist's only sync path is the dots.

## Acceptance criteria

- [x] A bordered control on the meta row issues a sync for the playlist, one press from the state it changes.
- [x] The label is "Sync" on the phone, from `@playliberty/i18n`, with a name and a busy state.
- [x] It is disabled while a run is live for that playlist, and never fires a second run.
- [x] The row still holds one line at 1.3 text scale.
- [x] The actions sheet no longer duplicates the sync row; the dial is unchanged.
- [x] A test asserts the control exists for a writer and is absent for a reader.

## Outcome

The detail's meta row now carries a quiet sync cell after the state and time. `PlaylistIdentity` takes `onSync`; `PlaylistDetail` passes it only when `canWritePlaylist` holds, so the owner and a write collaborator see it and a reader does not. The control calls the same `syncFromDial` path as the dial, so a refusal lands in the header's problem slot rather than vanishing.

The cell is a borderless `surface` square with the sync glyph, 32dp at the wide header and 24dp compact. The state line stays text, so the action reads as its end rather than a field around it. The `header.sync` key supplies the accessible name "Sync, {playlist}", and the busy state is carried by `accessibilityState` and by disabling and dimming the control. The visible word is gone by the prototype decision; the 48dp target comes from the hit slop around the smaller box. `PlaylistDetail` passes the full `syncInFlight` as the header's `syncing`, so the state line and the control agree while a mutation is pending, while the latest run is running, or while the playlist itself reports syncing.

The row holds one line at 1.3. The wide header reads the state, the time and the cell on one line; the compact header drops the time and uses the 24dp cell, which leaves the owner line intact at 1.3.

The detail's actions sheet drops its sync row, because the state line carries it; the gallery card menu keeps Sync now, and the dial, the empty state and the failed band keep their own start. The menu no longer repeats the verb. Tests cover the owner's press and name, the write collaborator's control, its absence for a reader, and the disabled state while a run is live. The header's active action layer now uses `box-none`, so the full-size layer behind Play, Shuffle and the actions door no longer swallows a press meant for the identity; the detail test pins the layer's pass-through. Mobile 608 passed, i18n 43 passed, `pnpm run build` clean, and the changed mobile files pass ESLint. The repo-wide lint is blocked by the unrelated untracked `apps/web/src/shared/components/PrototypeSwitcher/PrototypeSwitcher.tsx`, whose hardcoded copy predates this change.
