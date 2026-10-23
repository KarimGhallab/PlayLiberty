# 78: The transport keys steal Space from a focused control

**State:** `resolved`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Outcome

The window transport now asks `ownsKey` before doing anything. It stands down for a default another handler already prevented, for text entry and contenteditable, and for focus inside a button, a link, a native field, or a widget with `role` button, link, menu, listbox, slider or dialog, or `aria-haspopup`. A focused control keeps both Space and the arrows.

The player's scrubber now handles Left and Right locally, with the modifier keys left alone, so it still seeks while focused. The window handler stands down on the slider, which also keeps a double seek out. Space on the page body still toggles playback.

Tests hold Space on a focused button (not cancelled, no playback toggle, then the button's own click), Space on the body, arrows on a focused menu, listbox and slider, and a key another handler already prevented.

Amended by #91: the rule holds for the arrows, which navigate controls, but not for Space, which #91 claims back for the transport everywhere except text entry, an open menu and a dialog.

Verification: `pnpm run build` passes; the unit suites pass (tokens 2, i18n 39, youtube 31, ui-foundation 6, server 386, web 533). The touched files lint clean. The repo-wide `pnpm run lint` is currently blocked by the untracked `PrototypeSwitcher` prototype, whose hardcoded copy is unrelated to this issue.
