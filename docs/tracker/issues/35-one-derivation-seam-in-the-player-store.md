# 35: One derivation seam in the player store

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

Done. The player's shared derivations live with `PlayerState`, beside `currentIndex` and `nextIndex`, and the surfaces ask them instead of recomputing.

- `queuePlaylistId(state)` names the playlist the queue is playing (`queue[0]?.playlistId ?? null`). The store's refetch guard and three surfaces consume it: the detail page (its play control, the play handler and `isQueue`), the library item, and the shuffle action. The store's `every(...)` form and the surfaces' `queue[0]` form are both gone.
- `currentTrack(state)` derives the current entry from `currentIndex`. The bar consumes it for its identity and its keydown duration, and the audio element consumes it once in place of its three `queue.find` title, thumbnail and playlist name selectors.
- `hasNext(state)` is `nextIndex(state) >= 0`. The bar's hand-rolled `findIndex` plus bounds check is gone, and the detail's inline `nextIndex(state) >= 0` uses the selector too, so `nextIndex` is the one place the end-of-queue rule is stated.
- A surface that already had a local named after a selector was renamed (`playingPlaylistId`, `canSkipNext`) so the selector is not shadowed.

Tests: `playerStore.test.ts` gains a `the queue derivations` block covering `queuePlaylistId` (empty queue, this playlist, another playlist), `currentTrack` (the cursor, and null once it leaves the queue), and `hasNext`/`nextIndex` (true with a next, false at the last entry and with no cursor). The existing bar, audio, list and detail tests are unchanged and pass.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (web 401, server 330, i18n 39, ui-foundation 6, youtube 31, tokens 3) pass. Not committed.
