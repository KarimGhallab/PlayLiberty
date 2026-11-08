# 02: Every control meets Android's 48dp target

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)

## Outcome

`values.ts` gained `control-touch-android` at 48, and the mobile `touchTarget` reads it; `control-touch` stays 44 for
the web, whose rule is unchanged. Every control that reads `touchTarget` grew with it: chips, the track lane, the dial
rows, the sheet close, the checkbox row, the library header, the egress action and the player's step and orb targets.

Two surfaces had their own literals: the pushed screens' back and the detail's back and header controls now read
`touchTarget`, and the seek rail's row reads it too. The detail's 36pt secondary controls keep their painted size,
grow a 6pt hit box on every side, and sit 16pt apart, so the two 48dp targets meet without intersecting. The wide
pair is already 48pt painted, so it carries no hit slop and its 8pt gap needs no growth.

The token test pins 48, and the tests that pinned 44 on a control now pin 48. On the emulator the detail's back,
shuffle, actions and every lane measure 126x126px at 420 dpi, which is 48x48dp.
