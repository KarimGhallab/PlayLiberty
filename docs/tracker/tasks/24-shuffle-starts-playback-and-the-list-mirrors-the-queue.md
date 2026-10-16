# 24: Start playback from shuffle, and mirror the queue in the detail list

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Done, and the restore is the change that forced the rest.

- **The source order.** [`types.ts`](../../../apps/web/src/shared/player/types.ts) splits the queue from
  `sourceQueue`, the playlist's own order, and the store keeps the two in step through `startQueue`,
  `applyRefetch`, `remove`, `dropAndAdvance` and `clear`. `setShuffle(false)` puts the queue back in it,
  which retracts the recorded "turning it off keeps the order the shuffle left because there is no original
  to restore". `startQueue` takes the mode as a fourth parameter, so the flag and the order cannot disagree
  when a queue is built while a shuffle is on.
- **Persistence.** The stored payload is `sourceQueue`, and `hydrate` derives the playback queue from it and
  starts with `shuffle: false`; a payload written before the split reads its `queue` as the source order, the
  leniency `volume` already had. A relaunch therefore starts on the playlist's order, as the record says.
- **The press.** [`useStartPlaylist`](../../../apps/web/src/shared/player/useStartPlaylist/useStartPlaylist.ts) is the one
  action both surfaces call: an empty or foreign queue is built from this playlist shuffled, this playlist's
  own queue toggles the mode, and turning it on resumes a paused transport. The library and the detail's
  header both pass the playlist, and the detail passes its own `shuffle` into every `startQueue` so a rebuilt
  queue keeps the mode.
- **The order.** `shuffledWithLeader` hoists the kept track to the front of a full scatter of the rest, rather
  than leaving it at the index the shuffle would have given it. The transport starts on the first entry, so
  the first entry is the track the press kept: playing `D` in `A B C D E` gives a queue led by `D`, and
  turning the shuffle off returns the playlist's order under a playhead still on `D`.
- **The walk.** `nextIndex` lost its random branch, so `next`, previous and the end of a track all move one
  place through the queue as it stands and stop at its last entry. This is what makes the shuffle the order the
  listener can see, and it retracts the earlier "moves to another track when shuffled even at the order end".
  A row press inside this playlist's queue calls `play` and moves the cursor rather than rebuilding the queue,
  so a shuffled list and the queue playing it cannot disagree.
- **The refusal.** A playlist with no stored track fetches, finds nothing, and the press is refused through
  `NoticeToast`, a new sentence-only notice that withdraws itself. A failed read gets its own sentence,
  because "nothing stored" and "could not be read" are different facts.
- **The list.** [`orderTracksByQueue`](../../../apps/web/src/shared/player/queueOrder/queueOrder.ts) opens a group at
  each queued track and carries a row the queue does not hold into the group before it, so a pending track
  stays in its neighbourhood; [`PlaylistDetailPage`](../../../apps/web/src/views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage.tsx)
  draws in that order only while the queue is this playlist and the shuffle is on, because unshuffled the
  queue's order already is the playlist's own.

Tests: the store's restore and its source order through a refetch, the persistence payload and its migration,
the order function with a pending row, the action's five branches, and the library's start, refusal and
second-press restore. Records: [`library.md`](../../design-system/screens/library.md) and
[`playlist-header.md`](../../design-system/components/playlist-header.md) now say the control starts the
playlist rather than flagging a row. Not committed.

Verification: `pnpm run build`, `pnpm run lint`, the web unit suite (259 tests) and
`node docs/design/scripts/validate-design-tokens.cjs` all pass.
