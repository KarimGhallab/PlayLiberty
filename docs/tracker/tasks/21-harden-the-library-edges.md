# 21: Harden the library's edges

**What to build:** The gaps a stress tester hits on the library.

1. **A long name cannot be read.** A playlist name truncates with `text-overflow: ellipsis` and no reveal, so
   the full name is unrecoverable by pointer. At `--text-xl` the record's own 78-character probe is cut in
   both states, and on a card in the grid four of six names are cut. Add a `title` or an equivalent reveal so
   the name is recoverable, or state the decided alternative.
2. **A replaced delete is silent.** A second delete inside the undo window swaps the pending action and the
   toast updates to the second playlist, but nothing says the first intent was dropped.
   [`useDeferredAction`](../../../apps/web/src/shared/components/useDeferredAction.ts) already states the
   swap as the rule; make the replacement visible, or state why the swap is acceptable as it is.

Do not invent controls the glossary rules out. There is no search, sort, filter or pagination, and the
50-item page size is a recorded limit in [`library.md`](../../design-system/screens/library.md) under "What
the item deliberately does not carry". A signal for a truncated gallery, if any, must not be a control. The
library's silent-failure and live-progress half already has an owner in
[`01-silent-failures-and-live-sync-progress`](../issues/01-silent-failures-and-live-sync-progress.md); this
ticket does not duplicate it.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `bug`, `ready-for-agent`

- [x] A truncated name is recoverable by pointer.
- [x] A replaced deferred delete announces the replacement, or the record states the swap is deliberate.
- [x] No control is added that the glossary rules out.

**Verification:** a test for the name reveal and a test for the replaced delete pass; `pnpm run build`,
`pnpm run lint` and the web unit suite pass.

## Outcome

Done. Both edges are closed and neither adds a control the glossary rules out.

- **A long name.** The name element carries `title={playlist.name}`, on the detail's heading and the library's
  link alike, so a line the column cuts is recoverable by pointer. It is the reveal
  [`TrackRow`](../../../apps/web/src/shared/components/TrackRow/TrackRow.tsx) already uses for its ellipsized failure
  reason, and [`library.md`](../../design-system/screens/library.md) now says so in the truncation paragraph.
  Test: `PlaylistHeader.test.tsx` asserts the `title` on both arrangements.
- **A replaced delete.** `useDeferredAction` reports `replaced`, the action the current window displaced, and
  `windowId`, the window's ordinal. [`LibraryPage`](../../../apps/web/src/views/library/LibraryPage/LibraryPage.tsx) words
  the dropped intent and [`UndoToast`](../../../apps/web/src/shared/components/UndoToast/UndoToast.tsx) draws it under
  the current one, so the `status` region announces `“Rain On The Window” will not be deleted` when a second
  delete replaces the first. A repeated press of the same item is the same intent and reports nothing. Tests:
  the hook test and the library test. A side fix falls out of `windowId`: the countdown ring is keyed to the
  window, so a replacement restarts its sweep instead of leaving the old window's progress on a fresh one.

Verification: `pnpm run build`, `pnpm run lint`, the web unit suite (223 tests) and
`node docs/design/scripts/validate-design-tokens.cjs` all pass. Not committed.
