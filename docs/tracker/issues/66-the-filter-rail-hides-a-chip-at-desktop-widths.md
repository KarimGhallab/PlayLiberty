# 66: The filter rail hides a chip at desktop widths

**State:** `ready-for-agent`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** The detail's filter chip rail scrolls sideways at every width, with its scrollbar hidden and no overflow affordance, so at desktop widths the last chip is clipped behind the sort control and one filter is invisible.

**Current behavior:**
`PlaylistFilterChips.module.scss:6-17` makes the rail `flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none`, plus a hidden `::-webkit-scrollbar`, with no breakpoint and no edge fade, chevron or count of hidden chips. The control row (`PlaylistDetailPage.tsx:499`, `.playlistDetail__controls` at `PlaylistDetailPage.module.scss:160`) puts the chips in the lead and `PlaylistSortControl` at the end. On "Evening Jazz" at 1440 the chip container measures 563px wide against a `scrollWidth` of 692px, so `Unavailable 1` occupies x 1096-1228 and is cut mid-pill, with the sort button beside the fragment. At 1280 and at 390 the clipping is worse and a pill is cut mid-word. `docs/tracker/specs/12-sort-and-filter-the-track-list.md:133` records the intent as "horizontally scrollable on a narrow screen rather than wrapped", so a narrow-screen treatment is being applied at every width.

**Desired behavior:**
At desktop widths the rail shows all six chips with nothing clipped behind the sort. Wherever the rail must scroll, the overflow is announced by an edge fade or a chevron, so a hidden chip is discoverable, and tabbing to a chip scrolls it into view.

**Key interfaces:**

- `PlaylistFilterChips` stays the one owner of the rail's layout; the control row keeps the chips in the lead and the sort at the end.
- The chip set, the counts and the tones it draws are unchanged.

**Acceptance criteria:**

- [ ] At 1440 and at 1280 the six chips are fully visible and none is clipped by the sort control.
- [ ] Where the rail scrolls, an affordance marks the overflow, and focusing a chip brings it into view.
- [ ] A test holds chip visibility at a desktop width.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The chip set, the counts, the tones and the selection rule.
- `PlaylistSortControl`'s own geometry beyond the space it takes in the row.

## Observed

- At 1440, "Evening Jazz": the chip container is 563px wide against a `scrollWidth` of 692px, and `Unavailable 1` is clipped at x 1096-1228.
- The rail hides its scrollbar and draws no overflow affordance at any width.
- The spec scopes sideways scrolling to a narrow screen.

## Expected

- Every chip is visible at desktop widths, or its absence is announced.

## Evidence

- `apps/web/src/shared/components/PlaylistFilterChips/PlaylistFilterChips.module.scss:6-17`.
- `apps/web/src/views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage.tsx:499`; `apps/web/src/views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage.module.scss:160`.
- `docs/tracker/specs/12-sort-and-filter-the-track-list.md:133`.
- Impeccable critique of `apps/web`, 2026-10-16, priority issue P1. Measured in the seeded e2e stack (real server, fake YouTube adapter) at 1440x900, 1280x800 and 390x844.
