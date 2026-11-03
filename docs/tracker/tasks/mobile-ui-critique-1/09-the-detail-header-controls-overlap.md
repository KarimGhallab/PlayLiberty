# 09: The detail's two header controls overlap by 4dp

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The compact header's shuffle and actions are 36dp painted controls, each grown by a 6dp hit box on every side to clear 48. The block they sit in is 80dp wide, the actions sit at `width - TOP - 36`, and the shuffle sits at
`width - TOP - 80` at 36dp wide. So the shuffle's hit box ends at `x + 42` and the actions' begins at `x + 38`: a 4dp
overlap. The neighbour's touch can take a press meant for the other.

This contradicts the outcome recorded by
[`mobile-ui-audit-2/02`](../mobile-ui-audit-2/02-every-control-meets-androids-48dp-target.md), which states the pair
"still clears 48 without overlapping".

## Expected

Two adjacent targets that reach 48dp and do not intersect.

## Evidence

- `apps/mobile/src/views/playlist/PlaylistIdentity/PlaylistIdentity.tsx`: `NARROW_BLOCK`, `SMALL`, `SMALL_HIT`, `GAP`,
  and the two `left` expressions that place the pair.
- The audit's own acceptance line, quoted above.

## Acceptance criteria

- [x] The two hit boxes are disjoint while each still reaches 48 by 48 dp.
- [x] The painted 36dp size is unchanged.
- [x] A test computes both boxes from the constants and asserts no intersection, so the arithmetic cannot drift again.
- [x] The corrected sentence is recorded where the 48dp rule is stated.

## Outcome

The compact pair now has a 16pt painted gap instead of 8, so the two 48dp grown boxes meet with 4pt of air rather
than overlapping by 4. `narrowControlBoxes(width)` owns the arithmetic for both the component and its test: the pair
is still painted at 36, each keeps a 6pt hit box on every side, and the boxes are disjoint at every width.

The wide pair was also overlapping for the same reason: its controls are already 48pt painted, so the extra 6pt hit
box was unnecessary. It now carries no slop and its 8pt gap needs no growth. On the emulator the compact controls
measure 95 and 94px at 420 dpi, about 36dp, with 42px (16dp) between them.

The test checks both boxes at 320, 390 and 430 and pins 48 for each. The audit's outcome sentence, which claimed the
pair cleared 48 without overlapping, now says how the pair is spaced and that the wide pair carries no slop.
