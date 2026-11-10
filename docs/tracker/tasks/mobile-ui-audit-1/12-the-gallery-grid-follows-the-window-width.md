# 12: The gallery grid follows the window width

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

`galleryColumnCount` returns two columns below `GALLERY_WIDE_BREAKPOINT` (600dp) and three at or above it. The column
width subtracts one gap per column boundary, so the right column still lands on the inset. The grid, the skeleton and
the pinned row all read the same functions; a pinned card is 90% of a column, so the next one peeks.

The suite covers 320, 390, 600 and 840, checks that the columns and gaps fill the content box, and keeps the 320pt
phone at two columns. On the emulator at 840dp the gallery drew three columns, and the skeleton did the same while the
read landed.
