# 13: The player bar's artwork button is 44dp

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

`Artwork` now derives `hitSlop` from the token rather than a literal: `(touchTarget - size) / 2`, which is 2pt for the
44pt sleeve. The painted box and the bar's height are untouched, and the growth stays inside the top row's 48pt height,
with the 12pt gap to the identity on its right, so no neighbouring control is entered.

The test reads the painted size from `tokenLength('space-9') - tokenLength('space-1')`, asserts the slop is
`(touchTarget - paint) / 2`, and asserts the grown target reaches `touchTarget`. The emulator still shows the same
44dp artwork in the bar; the added area is invisible by design.
