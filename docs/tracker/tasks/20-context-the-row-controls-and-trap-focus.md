# 20: Name the row controls and trap the dialog's focus

**What to build:** Two accessibility gaps on the library.

1. **Repeated controls carry context-free names.** [`PlaylistHeader.tsx`](../../../apps/web/src/shared/components/PlaylistHeader.tsx)
   gives every row the same `aria-label="Shuffle"` and `aria-label="More actions"`, so a screen reader hears
   the same two controls N times with no tie to the row each belongs to. Append the playlist name to each
   control's accessible name, or scope the controls with `aria-labelledby` pointing at the name, so every
   row's controls are distinguishable. The share indicator is a `role="img"` labelled only "Private
   playlist" (and its siblings); decide whether it needs the playlist in its name.
2. **The dialog does not trap focus.** [`Dialog.tsx`](../../../apps/web/src/shared/components/Dialog.tsx)
   declares `role="dialog"` and `aria-modal="true"` but implements no trap, so Tab from the add button walks
   the page behind the scrim. Cycle Tab and Shift+Tab among the dialog's focusable elements, and restore
   focus to the control that opened it on close. Escape and the scrim close already work and must keep it.

**Blocked by:** None. Can start immediately.

**Status:** done

**Labels:** `bug`, `ready-for-agent`

- [x] Each row's shuffle and overflow controls carry an accessible name that names the playlist.
- [x] The share indicator's name is decided: the playlist is added, or the record states why it is not needed.
- [x] Focus cannot leave an open dialog by Tab, forward or backward.
- [x] Focus returns to the opener when the dialog closes.
- [x] Escape and the scrim still close the dialog.

**Verification:** a component test renders two rows and asserts two distinct accessible names; a dialog test
tabs past the last focusable and lands back on the first, then closes and finds focus on the opener.
`pnpm run build`, `pnpm run lint` and the web unit suite pass.

---

Delivered. `PlaylistHeader`'s shuffle is `Shuffle <name>` and its overflow is `More actions for <name>`; the
share indicator keeps the state alone as its name, because it is not a control and it sits inside the name
line, so naming the playlist there would repeat it on every row (the design record now states this). The
overflow gained the menu button's real keyboard: opening focuses the first item, ArrowUp opens onto the last,
the arrows and Home and End walk the items, Escape closes and returns focus to the button, and Tab closes and
moves on, with the items `tabindex="-1"` so the button stays the one tab stop.

`Dialog` now traps Tab and Shift+Tab inside the dialog, moves focus in on open (the caller's `initialFocus`,
else the first focusable, else the `tabindex="-1"` container), and returns focus to the element that opened
it on unmount. Escape and the scrim close are unchanged. The title is an `h2`. A `Dialog.test.tsx` was added
for the trap, the wrap, the initial-focus fallbacks and the restore; `PlaylistHeader.test.tsx` gained the
two-row distinct-names test. `apps/web/src/views/library/LibraryPage.test.tsx` and
`apps/web/src/views/playlist-detail/PlaylistDetailPage.test.tsx` were updated for the new names.

Two follow-ups the audit found are out of this ticket's scope: the row's quiet controls keep their 32px box
on desktop by design (`docs/design-system/components/playlist-header.md`) and now reach 44px on mobile, and
`SharePlaylistDialog` passes no `initialFocus` and so opens on the first focusable, which the fallback covers.
