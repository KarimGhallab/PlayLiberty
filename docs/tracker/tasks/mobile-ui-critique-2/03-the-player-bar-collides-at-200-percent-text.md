# 03: The player bar collides at 200% text

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

At `font_scale 2.0` the player bar's 32pt title sits in a 19.2dp line box and overlaps the meta line, the queue
position collides with the seek times, and the bar reads as a broken stack. The cause is a fixed `lineHeight` written
per control with no `maxFontSizeMultiplier`. The same pattern is drawn in the notice, the account sheet, the egress
cards, the track row, the sync band, the screen and the library header, where the brand renders at 40pt inside a 24dp
box.

## Expected

The bar is the only persistent chrome and the only transport, so it stays readable at every supported text size. A
control on a fixed layout caps its multiplier at the point the layout breaks; every other control derives its line
height from the scaled font size.

## Evidence

- `apps/mobile/src/player/PlayerBar/PlayerBar.tsx:772,784,791` and `SeekBar.tsx:202`: fixed line heights for 16pt and
  12pt text.
- Screenshot `crop-bar-2.0.png` in `/tmp/opencode/critique-mobile2/`.
- `Notice.tsx:287,293`, `AccountSheet.tsx:353`, `EgressScreen.tsx:569,582`, `TrackRow.tsx:333,350`, `SyncBand.tsx:318`,
  `Screen.tsx:117`, `LibraryHeader.tsx:87` repeat the pattern.
- `docs/PRODUCT.md`: Dynamic Type is honoured with a capped multiplier only where a fixed layout would break.

## Acceptance criteria

- [x] At 1.0, 1.3 and 2.0 the bar's title, meta, queue position and both seek times do not overlap or clip.
- [x] Every text control either caps its multiplier or scales its line height with its font size.
- [x] The cap is one value per surface, not a literal repeated per style.
- [x] The library header, the notice, the account sheet and the egress cards hold at 2.0.
- [x] A test pins the bar's cap so a later style edit cannot drop it.

## Verification

`adb -s emulator-5554 shell settings put system font_scale 2.0`, then read the library, the detail and the bar; repeat
at 1.3 and restore 1.0. Screenshots for each. Then `pnpm --filter @playliberty/mobile test`.

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

Checks: mobile typecheck and suite 636 pass. The root build, lint and unit run follows in the batch for this session.
