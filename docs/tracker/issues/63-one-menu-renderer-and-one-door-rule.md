# 63: One menu renderer and one door rule

**State:** `ready-for-agent`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** Issue 38 shared the menu dismissal and left the renderer behind: the menuitem markup, the divider and the close-focus rule are written twice, and the pending-door rule four times, though `pending` is already the seam's fact.

**Current behavior:**
Two modules render a menu by hand over the one dismissal seam: `usePlaylistHeader.tsx:303-351` and `TrackRow.tsx:154-195` each write `role="menu"`, `role="menuitem"`, `tabIndex={-1}`, a destructive divider and a close-then-run. `closeMenu` is identical in both (`usePlaylistHeader.tsx:186-189`, `TrackRow.tsx:90-93`). A third menu, `LanguageMenu.tsx:66`, renders `role="menuitemradio"` itself.

Separately, the pending door is written four times: `aria-disabled`, `tabIndex={-1}` and a `preventDefault` click are repeated in `usePlaylistHeader.tsx:388-401`, `PlaylistRowHeader.tsx:63-70`, `PlaylistCardHeader.tsx:81-89` and `PlaylistTileHeader.tsx:94-102`, although `pending` is already a field of the seam the arrangements receive.

**Desired behavior:**
One menu module renders the items and owns the roles, the divider and the close-focus contract, and serves all three menus. The seam returns the door's anchor props, so an arrangement places the door instead of restating its rule.

**Key interfaces:**

- A menu module taking an item list (label, icon, destructive, disabled, onSelect), the variant (item or radio) and the trigger ref that focus returns to.
- The header seam returns the props to spread onto whichever anchor an arrangement places: the disabled state, the tab index and the click guard.

**Acceptance criteria:**

- [ ] The menuitem markup is written once.
- [ ] `closeMenu` exists once.
- [ ] The pending-door rule exists once.
- [ ] The three menus keep their keyboard behaviour: arrow navigation, Escape, and focus returning to the trigger.
- [ ] Tests cover the shared menu and the door props once, rather than per arrangement.
- [ ] `pnpm run build`, `pnpm run lint`, the unit suites and `pnpm test:e2e` pass.

**Out of scope:**

- The arrangements themselves, whose split issue 17 settled.
- The dismissal and keyboard contract in `useDismissibleMenu`.
- The menus' stylesheets.

## Observed

- `role="menuitem"` markup is written in `usePlaylistHeader.tsx` and `TrackRow.tsx`, with an identical `closeMenu` in both.
- The pending door is written in four places.
- `pending` is already part of the seam the arrangements receive.

## Expected

One menu renderer for all three menus; one owner for the door rule.

## Evidence

- `apps/web/src/shared/components/PlaylistHeader/usePlaylistHeader.tsx:186-189`, `:303-351`, `:388-401`.
- `apps/web/src/shared/components/TrackRow/TrackRow.tsx:90-93`, `:154-195`.
- `apps/web/src/shared/components/PlaylistHeader/PlaylistCardHeader.tsx:81-89`.
- `apps/web/src/shared/components/PlaylistHeader/PlaylistRowHeader.tsx:63-70`.
- `apps/web/src/shared/components/PlaylistHeader/PlaylistTileHeader.tsx:94-102`.
- `apps/web/src/views/library/LanguageMenu/LanguageMenu.tsx:66`.
- Architecture review 2026-10-16, candidate 5.
