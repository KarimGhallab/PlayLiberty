# 91: Space belongs to the transport, not to the focused control

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Outcome

Key ownership now lives in `shared/player/transportKeys.ts`, with two predicates that the bar and the volume control both ask. `ownsGlobalKey` stands down only for a default another handler already prevented, for text entry (`input`, `textarea`, `select`, a contenteditable), and for a target inside an open `[role="menu"]` or a `[role="dialog"]`. `ownsArrowKey` keeps the old control set, because an arrow navigates a menu, a listbox and a slider as much as it seeks.

The transport therefore claims Space from every control a press could activate: a button, a link, a chip, a slider, the share badge, a menu trigger. It cancels the press, so the browser synthesizes no click, and Enter plus the pointer keep every control operable. Space in a text field still inserts a space, and inside an open menu or a dialog it still activates the item. Arrows behave exactly as before, including the scrubber's and the volume rail's own handling.

`VolumeControl` lost its private guard and its blind spot: its arrows now stand down for a focused menu, listbox, slider or button, its mute key stands down inside a menu or dialog, and both honour a default already prevented, so one key can no longer reach two handlers. The share badge loses nothing, Escape being its only key.

This reverses #78 for buttons, links and widget roles, which #78's own outcome now records.

Verification: `pnpm run build` and `pnpm run lint` pass; the unit suites pass (tokens 2, i18n 37, youtube 31, ui-foundation 5, server 381, web 551). The bar's tests hold Space on its own play button, on a link, a slider and a focusable badge, and Space inside a menu and a dialog, while the arrows still navigate a menu, a listbox and a slider and the text field keeps both. The volume tests hold the arrows yielding to a focused menu, the mute key yielding to a menu, a dialog and a prevented default.
