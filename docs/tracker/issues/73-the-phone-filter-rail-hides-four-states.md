# 73: The phone filter rail hides four states

**State:** `resolved`
**Category:** `bug`

## Outcome

The phone rail wraps under the sort instead of forcing one line, so all six chips are whole at 390 and no state needs a horizontal scroll. The `nowrap` override is gone; the phone keeps the hidden scrollbar and the measured edge fade only for a chip wider than the rail, which is the one case a single chip cannot fit. The chip set, counts, tone tokens and `aria-pressed` are unchanged.

`e2e/tests/arrange.spec.ts` now runs the whole-chip check at 390 as well as at 1440 and 1280, then keeps the keyboard check on the last chip. `docs/DESIGN.md` records that the chips wrap at every width.
