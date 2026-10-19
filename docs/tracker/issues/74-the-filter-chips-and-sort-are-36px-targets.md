# 74: The filter chips and the sort are 36px targets

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** The filter chips and the sort control are 36px tall with no grown hit box, against `DESIGN.md`'s rule that a target is 44px and a smaller control grows a box that paints nothing.

**Current behavior:**
`PlaylistFilterChips.module.scss` sets `height: var(--control-height)` (36) and uses `::before` only for the 7px selected dot. `PlaylistSortControl.module.scss` uses `min-height: var(--control-height)`. Both sit in a row of adjacent controls on touch, where a 36px target is easy to miss.

**Desired behavior:**
Both grow a 44px target through a box that paints nothing, the pattern the header's `.playlist-header__icon-btn::before { inset: -6px }` and the player's steps already use.

**Key interfaces:**

- `--control-touch` is the token for the owed size.
- The chips' 12px gap must keep two grown targets from overlapping.

**Acceptance criteria:**

- [ ] A chip and the sort control each present at least a 44x44 hit area.
- [ ] The painted size and the row's rhythm are unchanged.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The row lane and the transport, which already grow their targets.

## Observed

- Chips measured 36px tall; the sort control the same; the header's icon buttons grow 44 and these do not.

## Expected

- Every touch control on the detail meets the documented 44px target.

## Evidence

- `apps/web/src/shared/components/PlaylistFilterChips/PlaylistFilterChips.module.scss:65-72`.
- `apps/web/src/shared/components/PlaylistSortControl/PlaylistSortControl.module.scss:16`.
- `docs/DESIGN.md` ("A target is 44px").
- Impeccable critique of `apps/web`, 2026-10-19, priority issue P1.
