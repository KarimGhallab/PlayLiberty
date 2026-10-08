# 38: One dismissible-menu seam

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The outside-press plus Escape dismissal of a menu is hand-written three times, and the copies have drifted: the track row drops keyboard focus on Escape while the playlist header menu and the language menu return it to their trigger.

**Current behavior:**
Three modules each mount their own `document` `pointerdown` and `keydown` pair. `TrackRow.tsx:118-141` closes on both and returns focus nowhere, so Escape leaves the keyboard on nothing. `usePlaylistHeader.tsx:249-272` closes on both and its `closeMenu` returns focus to the button. `LanguageMenu.tsx:40-69` closes on both through `close`, which returns focus to the trigger, and additionally guards `event.target instanceof Node`. The rule is one interaction, but no module names it, and the three can drift further.

**Desired behavior:**
One hook owns the dismissal. It attaches the two document listeners while the menu is open, closes when the press is outside the container, closes and returns focus on Escape, and leaves the keyboard where the user put it on an outside press. Each caller keeps only its own anchor, its own items and the focus return on item selection.

**Key interfaces:**

- `useDismissibleMenu({ open, containerRef, onClose, returnFocusTo? }): void`, in `apps/web/src/shared/components/useDismissibleMenu/useDismissibleMenu.ts`.
- While `open`, it listens on `document` for `pointerdown` (close when the target is outside `containerRef`, guarded on `Node`) and for Escape (call `onClose`, then focus `returnFocusTo` when present).
- It is a no-op while closed, and it removes both listeners on close and unmount.
- Focus is returned on Escape only; an outside press does not steal focus.

**Acceptance criteria:**

- [x] One hook owns the two document listeners and the Escape focus return.
- [x] `TrackRow`, `usePlaylistHeader` and `LanguageMenu` use it, and no hand-rolled listener block remains in any of them.
- [x] Every menu returns focus to its trigger on Escape; `TrackRow` gains a trigger ref so it can.
- [x] An outside press closes the menu without moving focus.
- [x] A new test covers the hook (outside press, Escape with and without `returnFocusTo`, the closed state); the three component tests keep passing, adjusted for the track row's new focus return.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The arrow, Home and End roving, which only the playlist header menu has.
- The global media-key guard the player bar and the volume control share.
- Menu positioning and any portal.

## Observed

- `TrackRow.tsx:118-141`: listeners, Escape closes, focus lost.
- `usePlaylistHeader.tsx:243-272`: listeners, Escape closes through `closeMenu`, focus returned.
- `LanguageMenu.tsx:34-69`: listeners, Escape closes through `close`, focus returned, target guarded on `Node`.

## Expected

One hook owns the dismissal; the three call sites use it.

## Outcome

Done. One hook owns the dismissal.

- `useDismissibleMenu` lives in `apps/web/src/shared/components/useDismissibleMenu/useDismissibleMenu.ts`. While `open` it attaches `pointerdown` and `keydown` on `document`; a press outside `containerRef` (guarded on `Node`) calls `onClose` and leaves focus alone, and Escape calls `onClose` then focuses `returnFocusTo` when present. It is a no-op while closed and removes both listeners on close and unmount.
- `TrackRow`, `usePlaylistHeader` and `LanguageMenu` each pass their own anchor, a non-focusing `onClose` and their trigger ref; no hand-rolled listener block remains in any of them. `TrackRow` gained `menuButtonRef` so Escape returns to the lane button, which it did not before.
- Item selection and Tab keep their own focus return: `usePlaylistHeader.closeMenu` and `LanguageMenu.close` still move focus to the trigger.

Verification: a new `useDismissibleMenu.test.ts` covers the outside press (and that it does not move focus), a press inside, Escape with and without `returnFocusTo`, the closed state, and listener removal on close and unmount. `TrackRow.test.tsx` gained the Escape focus return and the outside-press close. The full web suite passes (39 files, 410 tests); `pnpm run build` and `pnpm run lint` are clean.

The server suite was failing independently when this ran: `apps/server/src/shared/access/entry.test.ts` (ticket 37, in flight) threw `randomUUID is not defined`. This change touches `apps/web` only.

## Evidence

- `apps/web/src/shared/components/TrackRow/TrackRow.tsx:110-141`.
- `apps/web/src/shared/components/PlaylistHeader/usePlaylistHeader.tsx:239-272`.
- `apps/web/src/views/library/LanguageMenu/LanguageMenu.tsx:34-69`.
- Architecture review 2026-10-08, candidate 4.
