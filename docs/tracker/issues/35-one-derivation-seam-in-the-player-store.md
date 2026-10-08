# 35: One derivation seam in the player store

**State:** `ready-for-agent`
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

- [ ] The queue's playlist is derived once and consumed by the store, the shuffle action and the list item.
- [ ] The current track is derived once and consumed by the bar and the audio element.
- [ ] `nextIndex` is the only place the end-of-queue rule is stated.
- [ ] The observable playback, shuffle and "now playing" behaviour is unchanged.
- [ ] Tests cover the selectors; the existing player store, bar and audio tests keep passing.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The queue construction and the refetch seam (issue 20).
- Persistence and the media session.
- Virtualization.

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
