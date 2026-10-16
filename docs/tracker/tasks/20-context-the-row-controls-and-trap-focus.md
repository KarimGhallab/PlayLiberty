# 20: Name the row controls and trap the dialog's focus

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`

## Outcome

The library's repeated row controls are named per row: `PlaylistHeader`'s shuffle is `Shuffle <name>` and its overflow is `More actions for <name>`, while the share indicator keeps the state alone because it is not a control inside the name line. The overflow gained the menu button's real keyboard: opening focuses the first item, ArrowUp opens onto the last, the arrows and Home and End walk the items, Escape closes and returns focus to the button, and Tab closes and moves on, with the items at `tabindex="-1"` so the button stays the one tab stop. `Dialog` traps Tab and Shift+Tab inside the dialog, moves focus in on open (the caller's `initialFocus`, else the first focusable, else the `tabindex="-1"` container), returns focus to the opener on unmount, and keeps Escape and the scrim close, with the title as an `h2`. The row's quiet controls keep their 32px box on desktop by design and reach 44px on mobile.

See [`08-see-the-library`](../specs/08-see-the-library.md).
