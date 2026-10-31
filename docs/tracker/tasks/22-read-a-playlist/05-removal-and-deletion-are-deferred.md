# 05: Removal and deletion are deferred

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`04`](04-the-rows-lane-and-sheet.md)

## Outcome

Remove joins the row sheet for an owner or a write collaborator. It hides the row at once, opens the shared
UndoSnackbar with the track's name and defers the request for six seconds. Undo cancels the request and restores the
row; a refused removal restores the row and shows the problem's sentence. A read collaborator sees no Remove.

Delete joins the detail's header sheet for the owner only. The detail's sheet carries Delete alone; spec `25` extends
it. The action dims the detail, disables its scroll, opens the same six-second window and pops to the gallery when the
delete lands. Undo restores the detail; a refused delete keeps the detail and shows the problem's sentence. A read or
write collaborator sees no header actions.

One window at a time: a second removal commits the first request before opening its own countdown. The window defaults
to six seconds and is injectable for the tests.

The two failure sentences were added to both catalogs. The identity gained the owner's overflow control, and the row
sheet gained the destructive Remove item.

## Verification

- Track sheet model 6 tests, sheet 4 tests, row 8 tests and detail 39 tests pass.
- Mobile 221 tests across 31 suites pass.
- `pnpm --filter @playliberty/mobile run typecheck` passes.
- `pnpm run lint:check` and `pnpm run build` pass.
- On the emulator, Delete dimmed the detail, disabled the scroll and showed "Deleting playlist" with Undo. The window
  expired before the undo, so the private Chine duplicate was deleted and then restored from the shared Chine source
  with its 70 associations. Its sync-run history is not restored.

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
