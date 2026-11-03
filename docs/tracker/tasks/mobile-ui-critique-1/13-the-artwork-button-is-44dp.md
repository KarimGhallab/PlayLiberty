# 13: The player bar's artwork button is 44dp

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The artwork in the player bar is a pressable that opens the playing playlist. Its box is `space-9` minus `space-1`,
which is 44dp, and it sets no `hitSlop`. It is the only control in the app below the 48dp token, and the player bar is
the one surface that is always under the thumb.

[`mobile-ui-audit-2/02`](../mobile-ui-audit-2/02-every-control-meets-androids-48dp-target.md) is resolved with the
claim that every control clears 48dp; the artwork is the residual.

## Expected

At least 48 by 48 dp of touch area, with the painted artwork unchanged.

## Evidence

- `apps/mobile/src/player/PlayerBar/PlayerBar.tsx`: the size expression passed to `Artwork`, the pressable it renders,
  and the absent `hitSlop`.
- `packages/tokens/src/values.ts`: `control-touch-android` is 48.
- `uiautomator` bounds measured on 2026-11-03: 116px square at 420 dpi, which is 44dp.

## Acceptance criteria

- [x] The artwork's effective target is at least 48 by 48 dp.
- [x] The painted size stays 44 and the bar's height reserve does not change.
- [x] No adjacent bar control's target is entered.
- [x] A test pins the token, not the literal.

## Outcome

`Artwork` now derives `hitSlop` from the token rather than a literal: `(touchTarget - size) / 2`, which is 2pt for the
44pt sleeve. The painted box and the bar's height are untouched, and the growth stays inside the top row's 48pt height,
with the 12pt gap to the identity on its right, so no neighbouring control is entered.

The test reads the painted size from `tokenLength('space-9') - tokenLength('space-1')`, asserts the slop is
`(touchTarget - paint) / 2`, and asserts the grown target reaches `touchTarget`. The emulator still shows the same
44dp artwork in the bar; the added area is invisible by design.
