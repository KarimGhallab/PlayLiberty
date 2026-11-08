# 03: The player bar collides at 200% text

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

Implemented on 2026-11-06. The measurement corrected the ticket's premise in the useful direction: on this build the
platform scales a font but does **not** scale a declared `lineHeight` (a probe at 2.0 with a literal `lineHeight: 60`
rendered a 60pt box), so every fixed leading clipped at large text. The fix derives the line box in JS from the same
multiplier as the font.

`apps/mobile/src/shared/styles/textMetrics.ts` owns the pair: `useTextScale(cap)` reads the system scale (capped where a
surface cannot grow) and `lineHeightFor(size, leading, scale)` returns the token leading at that scale. Every declared
`lineHeight` in `apps/mobile/src` now goes through it, so no style carries a value written for 1.0. The sweep covers the
ticket's list and the other surfaces that shared the pattern: the bar and its rail, the notice, the account sheet, the
egress cards and status line, the track row, the sync band, the screen frame, the library header, the sign-in door and
sign-out surface, the undo snackbar, the provision callback, and every sheet and empty state.

The bar caps because it is fixed chrome: `apps/mobile/src/player/PlayerBar/barTextScale.ts` holds one
`MAX_BAR_TEXT_SCALE = 1.3`, applied as `maxFontSizeMultiplier` to the title, the playlist, the queue position and both
seek times, and used for their line boxes. One value, one surface. At 2.0 the bar renders at 1.3, so the title, the
meta line and the rail keep their separation and the bar stays compact.

Verified on the emulator at 1.0, 1.3 and 2.0. At 2.0 the library header, the account sheet, the egress cards and the
detail all hold with their new leading, and the bar is the 1.3 bar (`/tmp/opencode/t03/lib-2.0-after.png`,
`account-2.0-after.png`, `egress-2.0-after.png`, `detail-2.0-after.png`); 1.3 and 1.0 are `lib-1.3.png` and
`library-1.0-final.png`. The notice uses the same helper, but no device path produced one during the check; its leading
is covered by the suite. Font scale was restored to 1.0.

`PlayerBar.test.tsx` pins `MAX_BAR_TEXT_SCALE` and asserts every bar word carries it.

The root build, lint and unit run follows in the batch for this session.
