# 21: Harden the library's edges

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Done. Both edges are closed and neither adds a control the glossary rules out.

- **A long name.** The name element carries `title={playlist.name}`, on the detail's heading and the library's
  link alike, so a line the column cuts is recoverable by pointer. It is the reveal
  [`TrackRow`](../../../apps/web/src/shared/components/TrackRow/TrackRow.tsx) already uses for its ellipsized failure
  reason, and the library design now says so in the truncation paragraph.
  Test: `PlaylistHeader.test.tsx` asserts the `title` on both arrangements.
- **A replaced delete.** `useDeferredAction` reports `replaced`, the action the current window displaced, and
  `windowId`, the window's ordinal. [`LibraryPage`](../../../apps/web/src/views/library/LibraryPage/LibraryPage.tsx) words
  the dropped intent and [`UndoToast`](../../../apps/web/src/shared/components/UndoToast/UndoToast.tsx) draws it under
  the current one, so the `status` region announces `“Rain On The Window” will not be deleted` when a second
  delete replaces the first. A repeated press of the same item is the same intent and reports nothing. Tests:
  the hook test and the library test. A side fix falls out of `windowId`: the countdown ring is keyed to the
  window, so a replacement restarts its sweep instead of leaving the old window's progress on a fresh one.

Verification: `pnpm run build`, `pnpm run lint` and the web unit suite (223 tests) all pass. Not committed.
