# 73: The phone filter rail hides four states

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** On the phone the detail's chip rail keeps one line and scrolls, but it shows only about two of six states, cuts the visible one mid-word behind the sort control, and offers no reliable affordance that more exist.

**Current behavior:**
`PlaylistFilterChips.module.scss` scrolls the rail with `scrollbar-width: none` and hides the webkit scrollbar. The phone keeps `flex-wrap: nowrap` and the sort control sits beside the rail, so `Stoc...` is clipped under it. Issue 66 fixed the desktop rail by wrapping; the phone path was left as is.

**Desired behavior:**
The phone states that there are more chips and lets the user reach them: a fade or chevron that the sort control does not clip, and no chip cut mid-word. Wrapping is acceptable where the room exists.

**Key interfaces:**

- `PlaylistFilterChips` keeps its tone tokens, its `aria-pressed` and its counts.
- `useRailOverflow` already derives the overflow state; the affordance reads from it.

**Acceptance criteria:**

- [ ] At 390 the user can tell that more than the visible chips exist.
- [ ] A visible chip is not clipped mid-word by the sort control.
- [ ] The chip counts and the selected state are unchanged.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Which chips exist and whether zero-count chips are hidden (see the ticket on the sync band and the chip set).

## Observed

- At 390: "Toutes 26" and a clipped "Stoc..." are visible; four states require a scroll with no hint.

## Expected

- Every state is discoverable, and the affordance is not under the sort control.

## Evidence

- `apps/web/src/shared/components/PlaylistFilterChips/PlaylistFilterChips.module.scss:50-62`.
- `/tmp/opencode/critique-a-detail-phone.png`, `/tmp/opencode/critique-a-phone-filter-empty.jpeg`.
- Impeccable critique of `apps/web`, 2026-10-19, priority issue P1.
