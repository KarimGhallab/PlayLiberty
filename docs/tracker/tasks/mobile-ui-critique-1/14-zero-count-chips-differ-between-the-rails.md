# 14: The detail draws zero-count chips and the gallery hides them

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

On a healthy playlist the detail's rail renders "Downloading 0" and "Failed 0" beside the states that matter, while
the library's rail shows only the states with a count. Two rails built on the same counts apply two rules, so the
detail's rail spends its width on zeros and pushes the selected chip further right.

## Expected

One rule for both rails. A state with nothing in it is not a filter worth offering, and the rail's scarce width goes
to the states that exist.

## Evidence

- `apps/mobile/src/views/playlist/PlaylistControls/PlaylistControls.tsx`: the chips drawn from `STATUS_CHIPS`.
- `apps/mobile/src/views/library/GalleryFilterBar/GalleryFilterBar.tsx`: the same counts filtered to non-zero.
- The 2026-11-03 screenshots, detail and library rails side by side.

## Acceptance criteria

- [x] Both rails apply the same rule, stated once in the module that owns the chips.
- [x] The selected chip is always drawn, even at zero.
- [x] The detail's rail does not lose a state the user can act on.
- [x] A test covers the shared rule.

## Outcome

`statusChips.ts` now owns one rule, `visibleStatusChips(counts, active)`: a state with nothing in it is omitted, and
the state in force is kept even at zero so an empty filtered view keeps its way back. Both rails consume it; neither
filters on its own any more. The detail's rail no longer spends its width on "Downloading 0" and "Failed 0", and any
state with tracks stays, so nothing actionable is lost.

The detail's fixture gained a page whose whole counts include one failed track, so the tests that select Failed start
from a visible chip; the empty-filter test then keeps that selected chip at zero while the empty state shows. On the
emulator, Chine's rail now reads "Toutes 71", "Stockée 67" and "Indisponible 4" with no zero-count chips.

`statusChips.test.ts` pins the omission, the selected-at-zero case and the fixed order.
