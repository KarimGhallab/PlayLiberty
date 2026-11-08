# 17: The library skeleton reserves no filter rail

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

`GallerySkeleton` now holds the rail. A 48dp row of three placeholder chips sits where `GalleryFilterBar` lands, the
skeleton takes the same `space-3` gap the loaded list uses, and the grid follows below it. The pinned heading is not
held: a first read has no way to know whether anything is pinned, so the skeleton takes the rail-only form the ticket
allows.

The rail and the grid are hidden from the accessibility tree, so the root still announces "Loading playlists." once.
The header's wordmark swap was already removed by the font gate in ticket 01.

The gallery test asserts the reserved rail at `touchTarget` height in the pending state.
