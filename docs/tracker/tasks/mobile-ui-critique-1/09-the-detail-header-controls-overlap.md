# 09: The detail's two header controls overlap by 4dp

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

The compact pair now has a 16pt painted gap instead of 8, so the two 48dp grown boxes meet with 4pt of air rather
than overlapping by 4. `narrowControlBoxes(width)` owns the arithmetic for both the component and its test: the pair
is still painted at 36, each keeps a 6pt hit box on every side, and the boxes are disjoint at every width.

The wide pair was also overlapping for the same reason: its controls are already 48pt painted, so the extra 6pt hit
box was unnecessary. It now carries no slop and its 8pt gap needs no growth. On the emulator the compact controls
measure 95 and 94px at 420 dpi, about 36dp, with 42px (16dp) between them.

The test checks both boxes at 320, 390 and 430 and pins 48 for each. The audit's outcome sentence, which claimed the
pair cleared 48 without overlapping, now says how the pair is spaced and that the wide pair carries no slop.
