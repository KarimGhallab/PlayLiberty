# 38: One dismissible-menu seam

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

One hook owns the dismissal. `useDismissibleMenu` lives in `apps/web/src/shared/components/useDismissibleMenu/useDismissibleMenu.ts`: while `open` it attaches `pointerdown` and `keydown` on `document`, a press outside `containerRef` (guarded on `Node`) calls `onClose` and leaves focus alone, and Escape calls `onClose` then focuses `returnFocusTo` when present; it is a no-op while closed and removes both listeners on close and unmount. `TrackRow`, `usePlaylistHeader` and `LanguageMenu` each pass their own anchor, a non-focusing `onClose` and their trigger ref, and no hand-rolled listener block remains in any of them, with `TrackRow` gaining `menuButtonRef` so Escape returns to the lane button, which it did not before. Item selection and Tab keep their own focus return: `usePlaylistHeader.closeMenu` and `LanguageMenu.close` still move focus to the trigger.
