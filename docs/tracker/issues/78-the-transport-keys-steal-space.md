# 78: The transport keys steal Space from a focused control

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** The player's window-level key handler excludes only text-entry targets, so Space on any focused button toggles playback and suppresses that button's own activation, and arrow keys seek while focus is on a control that does not stop propagation.

**Current behavior:**
`PlayerBar.tsx` adds a window `keydown` listener that returns early only for `input`, `textarea`, `select` and `[contenteditable]`. It does not check `event.defaultPrevented` or the focused element's role. Space calls `preventDefault` and toggles playback, which cancels the browser's activation of a focused button (Enter still activates it). Arrow left/right seeks.

**Desired behavior:**
The transport shortcuts never take a key from a focused control. Guard on `event.defaultPrevented` and on the focused element being a button, a link, or a widget with a role the key belongs to (`menu`, `listbox`, `slider`, `dialog`, `aria-haspopup`). Space stays a transport key when focus is on the page body.

**Key interfaces:**

- `useDismissibleMenu` already stops propagation for the keys a menu owns; the guard covers the rest.
- The seek step and the store's own guards are unchanged.

**Acceptance criteria:**

- [ ] Space on a focused button activates that button and does not toggle playback.
- [ ] Space away from a control still toggles playback.
- [ ] Arrow keys do not seek while a menu, a listbox or a slider has focus.
- [ ] A test holds the Space-on-a-button case.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The menu's own key contract, which is already implemented.

## Observed

- `PlayerBar.tsx:47-92` guards text entry only.

## Expected

- A focused control keeps its keys; the transport claims them only when nothing else does.

## Evidence

- `apps/web/src/shared/player/PlayerBar/PlayerBar.tsx:47-92`.
- Impeccable critique of `apps/web`, 2026-10-19, priority issue P2.
