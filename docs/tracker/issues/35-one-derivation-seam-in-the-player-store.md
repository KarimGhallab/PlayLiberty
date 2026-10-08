# 35: One derivation seam in the player store

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The player store's own facts are re-derived at every surface: the queue-ownership invariant is written as `every(...)` in the store and as `queue[0]?.playlistId` in two UI modules, the current track is re-scanned by five selectors, and the bar re-implements the `nextIndex` rule the types module already owns.

**Current behavior:**
`applyRefetch` decides "is this the queue's playlist" with `queue.every(track => track.playlistId !== playlistId)`, while `useShufflePlaylist` and `PlaylistListItem` decide it with `queue[0]?.playlistId === playlist.id`. The current track is re-derived as `queue.find(track => track.id === currentId)` in `PlayerBar` and three selectors in `PlayerAudio`, and once more in the bar's keydown. `PlayerBar.hasNext` hand-rolls `findIndex` plus a bounds check, while `types.ts` already exports `currentIndex` and `nextIndex`, the latter documented as the one place "what comes next" is decided.

**Desired behavior:**
The store exposes the derivations as selectors: the queue's playlist, the current track, and next/has-next routed through the existing `nextIndex`. Every surface consumes them, so one fact has one derivation and the store's `every` form and the surfaces' `queue[0]` form cannot drift. The observable playback behaviour is unchanged.

**Key interfaces:**

- A queue-ownership selector (the playlist the queue is playing, or null), used by the store, the shuffle action and the list item.
- A current-track selector, used by the bar and the audio element.
- `hasNext`/next routed through the existing `nextIndex`, not re-implemented.

**Acceptance criteria:**

- [x] The queue's playlist is derived once and consumed by the store, the shuffle action and the list item.
- [x] The current track is derived once and consumed by the bar and the audio element.
- [x] `nextIndex` is the only place the end-of-queue rule is stated.
- [x] The observable playback, shuffle and "now playing" behaviour is unchanged.
- [x] Tests cover the selectors; the existing player store, bar and audio tests keep passing.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The queue construction and the refetch seam (issue 20).
- Persistence and the media session.
- Virtualization.

## Outcome

Done. The player's shared derivations live with `PlayerState`, beside `currentIndex` and `nextIndex`, and the surfaces ask them instead of recomputing.

- `queuePlaylistId(state)` names the playlist the queue is playing (`queue[0]?.playlistId ?? null`). The store's refetch guard and three surfaces consume it: the detail page (its play control, the play handler and `isQueue`), the library item, and the shuffle action. The store's `every(...)` form and the surfaces' `queue[0]` form are both gone.
- `currentTrack(state)` derives the current entry from `currentIndex`. The bar consumes it for its identity and its keydown duration, and the audio element consumes it once in place of its three `queue.find` title, thumbnail and playlist name selectors.
- `hasNext(state)` is `nextIndex(state) >= 0`. The bar's hand-rolled `findIndex` plus bounds check is gone, and the detail's inline `nextIndex(state) >= 0` uses the selector too, so `nextIndex` is the one place the end-of-queue rule is stated.
- A surface that already had a local named after a selector was renamed (`playingPlaylistId`, `canSkipNext`) so the selector is not shadowed.

Tests: `playerStore.test.ts` gains a `the queue derivations` block covering `queuePlaylistId` (empty queue, this playlist, another playlist), `currentTrack` (the cursor, and null once it leaves the queue), and `hasNext`/`nextIndex` (true with a next, false at the last entry and with no cursor). The existing bar, audio, list and detail tests are unchanged and pass.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (web 401, server 330, i18n 39, ui-foundation 6, youtube 31, tokens 3) pass. Not committed.

## Observed

- Store: `queue.every(...)`; surfaces: `queue[0]?.playlistId`.
- `queue.find(track => track.id === currentId)` at six sites.
- `PlayerBar.hasNext` re-implements `nextIndex`.

## Expected

Store selectors for the queue's playlist, the current track and next/has-next.

## Evidence

- `apps/web/src/shared/player/playerStore/playerStore.ts:137-146`.
- `apps/web/src/shared/player/useShufflePlaylist/useShufflePlaylist.ts:48`; `apps/web/src/views/library/PlaylistListItem.tsx:55-59`.
- `apps/web/src/shared/player/PlayerBar/PlayerBar.tsx:53-66,111-113`; `apps/web/src/shared/player/PlayerAudio/PlayerAudio.tsx:30-43`; `apps/web/src/shared/player/types.ts:112-138`.
- Architecture review 2026-10-08, candidate 4.
