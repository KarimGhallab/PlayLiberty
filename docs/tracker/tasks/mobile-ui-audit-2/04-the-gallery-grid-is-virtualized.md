# 04: The gallery grid is virtualized

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)

## Outcome

The gallery's scroll is a `FlatList` whose data is one row per line of cards, chunked by the shared
`galleryColumnCount` rule: two columns below 600 and three at or above. The pinned group is the list header, so its
horizontal row, its peek and its offset clamp are unchanged and it stays mounted. The syncing heading is a row of its
own, and the rest follows without one. Pull-to-refresh, the scroll-distance load-more, both filters, the empty state
and the skeleton are unchanged.

The gallery test renders 200 playlists and asserts that fewer than 200 cards mount, and the emulator at 390 draws two
columns with the pinned row at the top.
