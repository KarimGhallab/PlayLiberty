# 14: The pinned card is narrower than the grid

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

Implemented on 2026-11-06. The pinned card is the grid card, and the row's own width makes the peek.

`galleryPinnedWidth` now returns `galleryColumnWidth`. The gallery runs edge to edge (the root takes a negative
horizontal inset) so the horizontal row can show what comes next, while every band restores the page inset itself: the
filter bar sits in a padded wrapper, the grid rows and headings are padded, and the pinned content keeps a left inset so
its first card starts on the grid's line. The add dial takes the same inset through `rightOffset`, so it stays on the
content edge.

Measured from the 1.0 hierarchy on the 411dp emulator: pinned cards and grid cells are both 482px wide, both right
edges land on 1038, and the third pinned card starts at 1070, leaving a 10px (about 4dp) sliver at the screen edge.
That sliver is the maximum a full-width card allows once the second card's right edge is held on the page's content
edge. The card controls and their one-target layout are untouched.

`galleryColumns.test.ts` asserts the width equality and that two cards plus the gap fill the content box while the page
inset exceeds the gap, which is the peek.

The root build, lint and unit run follows in the batch for this session.
