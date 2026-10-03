# 01: Build the queue and play it

**What to build:** A listener presses play on a track and the whole playlist becomes the queue, starting at the
track pressed rather than from the top. Playing a track in another playlist replaces the queue rather than
extending it. Each queue entry records the playlist the queue was built from, so the player can name where the
music comes from. The queue holds track ids and the playlist it belongs to, never a stream address, which is
derived when a track is reached. A refetch of the playlist re-applies the order the queue was built with: a
known track keeps its place, a track new to the queue is appended, and a track the refetch no longer returns is
dropped, and none of that moves the current index or the offset. The persisted state is the queue, its order,
the index of the current track and the offset within it, and a relaunch resumes at that offset rather than at
the start of the track.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] Pressing play on a track builds the queue from that track's playlist, in the playlist's order, starting at that track.
- [ ] Playing a track in another playlist replaces the queue rather than extending it, and records the new playlist.
- [ ] A refetch arriving mid-playback leaves the order, the index and the offset unchanged, merging by track id as known, new and dropped.
- [ ] The persisted state carries the order, the index and the offset, and a relaunch resumes at the offset.
- [ ] The queue survives closing and reopening the tab, and playing writes nothing to the server.
