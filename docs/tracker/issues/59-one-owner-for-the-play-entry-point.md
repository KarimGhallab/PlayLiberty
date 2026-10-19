# 59: One owner for the play entry point

**State:** `ready-for-agent`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The store exposes play primitives, so four surfaces each decide whether to toggle or rebuild, the read-then-start body is written twice, and the header's "playable" contradicts the queue's.

**Current behavior:**
`usePlayerStore` exposes `setPlaying`, `play` and `startQueue`, so "press play" is decided at each surface. `useStartPlaylist` owns the playlist-start rule for a playlist: the current-queue guard (`:59`), the whole-list read (`:73`) and `startPlaylistQueue` (`:87`), with `empty` and `unreachable` returned as a refusal rather than drawn. `PlaylistDetailPage` re-implements that rule locally for the same surface: `startFrom` (`:158`), `playTrack` (`:190`), `playPlaylist` (`:209`) and `retryPlayback` (`:222`), repeating the guard at `:199` and the read-then-start sequence, and it imports the shared hook only for `shufflePlaylist`. The same guard is written once more in `PlaylistItem.tsx:54`.

The two owners of "playable" also disagree. The queue keeps only stored tracks (`playerQueue.ts:17`) and the track row's hit layer gates on the same fact (`TrackRow.tsx:73`), while the header enables its play control on `playlist.trackCount > 0` (`usePlaylistHeader.tsx:199`), which counts tracks that are pending, failed or unavailable. A playlist whose tracks are all unavailable therefore draws a live Play whose press answers the `empty` refusal.

**Desired behavior:**
One module owns the play transition. Pressing a playlist starts it in its own order or shuffled; pressing it while its own queue is loaded toggles the playback; pressing a track inside the loaded queue moves the playhead; pressing a playlist that is not loaded reads the whole list, builds the queue and starts it. A refusal is returned and never drawn, so the screen keeps its own notice. The four surfaces call this module and keep only their presentation. Whether a playlist has anything playable is answered by the same module that owns the queue filter, so the header and the queue cannot disagree.

**Key interfaces:**

- One play control covering: start a playlist, start it shuffled, start it at a track id, toggle the loaded queue, and retry the intent that failed.
- The refusal value and its notice window stay part of the interface, as `useStartPlaylist` has them today.
- A single exported predicate answering whether a playlist has a playable track, read by the header's enable rule and by the queue construction.

**Acceptance criteria:**

- [ ] The current-queue guard is written once.
- [ ] The read-then-start sequence is written once.
- [ ] `PlaylistDetailPage` calls the shared owner for play, play-at-track, play-playlist and retry, and no longer reads the queue key itself.
- [ ] The header's play control is enabled by the same fact the queue filter uses.
- [ ] A playlist with no stored track does not draw an enabled Play.
- [ ] Tests cover toggle, start, start-at-track and both refusals through the one interface; the existing detail, library and player suites keep passing.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The store's transport rules: skip, advance, end of queue, shuffle order, merge on refetch.
- The player bar's keyboard transport and scrub geometry.
- The persistence of the queue and the position.

## Observed

- The current-queue guard is written at `useStartPlaylist.ts:59`, `PlaylistDetailPage.tsx:199` and `PlaylistItem.tsx:54`.
- The read-then-start body is written at `useStartPlaylist.ts:73-92` and `PlaylistDetailPage.tsx:174-179`.
- The header enables Play on `trackCount > 0` while the queue keeps stored tracks only.

## Expected

One module owns the transition and the playable fact; the four surfaces call it.

## Evidence

- `apps/web/src/shared/player/useStartPlaylist/useStartPlaylist.ts:49-100`.
- `apps/web/src/views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage.tsx:158-228`.
- `apps/web/src/shared/components/PlaylistHeader/usePlaylistHeader.tsx:199`.
- `apps/web/src/shared/player/playerQueue/playerQueue.ts:17`.
- `apps/web/src/shared/components/TrackRow/TrackRow.tsx:73`.
- Architecture review 2026-10-16, candidate 1.
