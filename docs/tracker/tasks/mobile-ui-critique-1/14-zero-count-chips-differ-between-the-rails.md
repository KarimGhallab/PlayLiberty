# 14: The detail draws zero-count chips and the gallery hides them

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

`statusChips.ts` now owns one rule, `visibleStatusChips(counts, active)`: a state with nothing in it is omitted, and
the state in force is kept even at zero so an empty filtered view keeps its way back. Both rails consume it; neither
filters on its own any more. The detail's rail no longer spends its width on "Downloading 0" and "Failed 0", and any
state with tracks stays, so nothing actionable is lost.

The detail's fixture gained a page whose whole counts include one failed track, so the tests that select Failed start
from a visible chip; the empty-filter test then keeps that selected chip at zero while the empty state shows. On the
emulator, Chine's rail now reads "Toutes 71", "Stockée 67" and "Indisponible 4" with no zero-count chips.

`statusChips.test.ts` pins the omission, the selected-at-zero case and the fixed order.
