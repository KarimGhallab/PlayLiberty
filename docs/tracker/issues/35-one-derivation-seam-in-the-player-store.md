# 35: One derivation seam in the player store

**State:** `resolved`
**Category:** `enhancement`

## Outcome

The player's shared derivations live with `PlayerState`, beside `currentIndex` and `nextIndex`, and the surfaces ask them instead of recomputing. `queuePlaylistId(state)` names the playlist the queue is playing (`queue[0]?.playlistId ?? null`), consumed by the store's refetch guard, the detail page (its play control, the play handler and `isQueue`), the library item, and the shuffle action, so the store's `every(...)` form and the surfaces' `queue[0]` form are both gone. `currentTrack(state)` derives the current entry from `currentIndex`, consumed by the bar for its identity and keydown duration and by the audio element in place of its three `queue.find` selectors. `hasNext(state)` is `nextIndex(state) >= 0`, so the bar's hand-rolled `findIndex` and the detail's inline check are gone and `nextIndex` is the one place the end-of-queue rule is stated. A surface that already had a local named after a selector was renamed (`playingPlaylistId`, `canSkipNext`) so the selector is not shadowed.
