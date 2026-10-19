# 74: The filter chips and the sort are 36px targets

**State:** `resolved`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Outcome

Each chip now carries a transparent 44x44 box on `::after`, centred on its 36px drawn box; the selection dot stays on `::before`. The sort carries the same box on `::before`, leaving the open menu's 2px rule on `::after`. The drawn chips, sort, and row rhythm are unchanged.

On a phone the chip rail is a horizontal scroll container, which would clip the box's four-pixel reach above and below. The rail gains four pixels of block padding with an equal negative block margin, so the target stays inside the scroll box while the chip's painted position holds.

The phone target test now measures `All 1` and the sort at their drawn 36px height and probes the 44px box on all four sides; the filter-chip arrange test still passes at desk and phone widths.

Verification: `pnpm run build` and `pnpm run lint` pass; the unit suites pass (tokens 2, i18n 39, youtube 31, ui-foundation 6, server 386, web 511).
