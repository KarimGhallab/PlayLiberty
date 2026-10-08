# 38: One dismissible-menu seam

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

Done. One hook owns the dismissal.

- `useDismissibleMenu` lives in `apps/web/src/shared/components/useDismissibleMenu/useDismissibleMenu.ts`. While `open` it attaches `pointerdown` and `keydown` on `document`; a press outside `containerRef` (guarded on `Node`) calls `onClose` and leaves focus alone, and Escape calls `onClose` then focuses `returnFocusTo` when present. It is a no-op while closed and removes both listeners on close and unmount.
- `TrackRow`, `usePlaylistHeader` and `LanguageMenu` each pass their own anchor, a non-focusing `onClose` and their trigger ref; no hand-rolled listener block remains in any of them. `TrackRow` gained `menuButtonRef` so Escape returns to the lane button, which it did not before.
- Item selection and Tab keep their own focus return: `usePlaylistHeader.closeMenu` and `LanguageMenu.close` still move focus to the trigger.

Verification: a new `useDismissibleMenu.test.ts` covers the outside press (and that it does not move focus), a press inside, Escape with and without `returnFocusTo`, the closed state, and listener removal on close and unmount. `TrackRow.test.tsx` gained the Escape focus return and the outside-press close. The full web suite passes (39 files, 410 tests); `pnpm run build` and `pnpm run lint` are clean.

The server suite was failing independently when this ran: `apps/server/src/shared/access/entry.test.ts` (ticket 37, in flight) threw `randomUUID is not defined`. This change touches `apps/web` only.
