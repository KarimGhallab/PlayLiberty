# 59: One owner for the play entry point

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Outcome

One module owns the play transition. `usePlayTransition` in `apps/web/src/shared/player/usePlayTransition/usePlayTransition.ts` answers `play`, `shuffle`, `playTrack`, `retry`, `starting`, `retryable` and `refusal`, and every surface calls it: the detail's header and rows, and the library's items. It replaces `useStartPlaylist` and the four local callbacks in `PlaylistDetailPage` (`startFrom`, `playTrack`, `playPlaylist`, `retryPlayback`), so the current-queue guard and the read-then-start sequence are each written once. The intent a press was made with is carried by the module, so a failed shuffle retries as a shuffle.

The read is the module's too: `readPlaylistQueue(queryClient, playlistId)` in `queries.ts` is the one place the queue key and its fetch are paired, and the detail no longer reads it.

The playable fact has one owner. `hasPlayableTrack({ counts })` in `playerQueue.ts` answers from the stored count of the whole playlist, beside the filter that builds the queue, and the header's `playable` prop is required so no arrangement can default it. The header no longer derives it from `trackCount`, which counts every association. A playlist whose tracks are all pending, failed or unavailable now draws a disabled Play instead of one whose press answers "empty". `PlaylistTileHeader` forwards the fact it previously dropped.

Observable behaviour is otherwise unchanged: a press on a playlist starts it in its own order or shuffled, a press on its own loaded queue toggles, a row press moves the playhead, and both refusals still return rather than draw. The detail draws its inline retry for an unread queue and no longer also raises the notice toast for the same failure.

Tests: `usePlayTransition.test.tsx` covers toggle, start, shuffled start, start-at-track, the empty refusal, the unreachable refusal with its retry, and the in-flight state; `hasPlayableTrack` is covered beside the queue build it must agree with; the header, detail and library suites each gained the disabled-Play case. `pnpm run build`, `pnpm run lint`, the unit suites (478 web, 372 server) and the e2e journeys through playback, shuffle, library, curate, live and arrange pass.

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
