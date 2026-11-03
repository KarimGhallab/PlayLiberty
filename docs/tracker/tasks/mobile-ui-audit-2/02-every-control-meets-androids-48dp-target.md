# 02: Every control meets Android's 48dp target

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The mobile target token is 44, the iOS point size, and every control uses it: back, sheet close, chips, checkbox
rows, track lane, player steps, dial rows and egress actions. Material asks for 48dp.

## Expected

Every mobile control takes a 48dp hit area, with the painted size unchanged where the design wants 44. The web keeps
its 44px rule.

## Evidence

- `packages/tokens/src/values.ts`: `control-touch` is 44.
- `apps/mobile/src/shared/styles/tokens.ts`: `touchTarget` re-exports it.
- The emulator at 420 dpi measures a 44dp control at 115px.

## Acceptance criteria

- [x] Every mobile control has a target of at least 48 by 48 dp.
- [x] The web's 44px target is unchanged.
- [x] A test measures the targets, or the token override is asserted.
- [x] No two adjacent targets overlap after the growth.

## Outcome

`values.ts` gained `control-touch-android` at 48, and the mobile `touchTarget` reads it; `control-touch` stays 44 for
the web, whose rule is unchanged. Every control that reads `touchTarget` grew with it: chips, the track lane, the dial
rows, the sheet close, the checkbox row, the library header, the egress action and the player's step and orb targets.

Two surfaces had their own literals: the pushed screens' back and the detail's back and header controls now read
`touchTarget`, and the seek rail's row reads it too. The detail's 36pt secondary controls keep their painted size and
grow a 6pt hit box, so the pair still clears 48 without overlapping.

The token test pins 48, and the tests that pinned 44 on a control now pin 48. On the emulator the detail's back,
shuffle, actions and every lane measure 126x126px at 420 dpi, which is 48x48dp.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck` and
`pnpm run lint:check` pass. The emulator shows the same painted controls with 48dp targets.
