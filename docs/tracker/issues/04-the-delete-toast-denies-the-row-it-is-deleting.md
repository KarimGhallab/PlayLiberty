# 04: The delete toast denies the row it is deleting

**State:** `needs-triage`
**Category:** `bug`

## Observed

Deleting a playlist opens the undo window and the toast says "Deleting playlist Focus", while the Focus
row stays fully rendered, hoverable and clickable for the whole window. The screen and the toast disagree.
If the window is missed, the row simply disappears with no confirmation.

- [`PlaylistListItem.tsx:84-93`](../../../apps/web/src/views/library/PlaylistListItem.tsx) defers the
  delete with `message: 'Deleting playlist'`.
- [`LibraryPage.tsx:153-164`](../../../apps/web/src/views/library/LibraryPage/LibraryPage.tsx) draws the
  `UndoToast` for the pending window.
- Nothing marks the row pending: the list is invalidated only when the deferred commit runs, so the row is
  still the live item until then.

## Expected

The row reflects its pending state for the window: dimmed, `aria-busy`, its controls disabled, or removed
optimistically and restored on cancel. Either way the screen stops claiming a deletion it is not showing,
and a user cannot open or rename a playlist that is about to vanish.

## Evidence

- Live, 2026-10-05: pressing Delete on Focus showed "Deleting playlist Focus" over an unchanged, still
  interactive row.
- `useDeferredAction` owns the window and already exposes `pending`, so the page can pass that down to the
  item.
- Critique run `views-library-librarypage-librarypage-tsx-a51b86be`, Priority Issue P2 (and the emotional
  journey's delete valley).
