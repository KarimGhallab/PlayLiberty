# 24: Start playback from shuffle, and mirror the queue in the detail list

**Status:** resolved

## Outcome

`types.ts` splits the queue from `sourceQueue`, the playlist's own order, and the store keeps the two in step through `startQueue`, `applyRefetch`, `remove`, `dropAndAdvance` and `clear`, so `setShuffle(false)` restores the source order; the stored payload is `sourceQueue`, `hydrate` derives the playback queue from it and starts with `shuffle: false`, and `startQueue` takes the mode as a fourth parameter so the flag and the order cannot disagree. `useStartPlaylist` is the one action both surfaces call: an empty or foreign queue is built from this playlist shuffled, this playlist's own queue toggles the mode, and turning it on resumes a paused transport. `shuffledWithLeader` hoists the kept track to the front of a full scatter of the rest, and `nextIndex` lost its random branch, so next, previous and the end of a track all move one place through the queue as it stands and stop at its last entry; a row press inside this playlist's queue calls `play` and moves the cursor rather than rebuilding the queue. A playlist with no stored track has its press refused through `NoticeToast`, a sentence-only notice that withdraws itself, with its own sentence for a failed read, and `orderTracksByQueue` opens a group at each queued track and carries a row the queue does not hold into the group before it, which `PlaylistDetailPage` draws only while the queue is this playlist and the shuffle is on.

See [`08-see-the-library`](../specs/08-see-the-library.md).
