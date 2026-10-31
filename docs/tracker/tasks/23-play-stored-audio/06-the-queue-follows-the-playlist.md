# 06: The queue follows the playlist

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-bar-plays-the-queue.md)

## What to build

The queue read that feeds the detail also feeds the live queue. Every refetch is re-applied over the queue that is
playing: a known track keeps its place, including a shuffled order, a track new to the playlist is appended in the
server's order, and a track the read no longer returns is dropped. A read of another playlist is ignored, so a queue
never accumulates across playlists.

The current track and its position do not move while it is still in the playlist. When the current track leaves the
playlist, playback stops and the bar clears. Starting another playlist still replaces the queue. The detail's list
continues to mirror the queue's order while shuffle is on. The player never writes to the server.

## Acceptance criteria

- [ ] A refetch keeps every known track in its place and appends a new one.
- [ ] A track missing from the refetch is dropped, and a shuffled order survives the merge.
- [ ] A refetch of another playlist does not change this queue.
- [ ] The current track and its position stay put until it leaves the playlist; then playback stops and the bar clears.
- [ ] Starting another playlist replaces the queue.
- [ ] The detail's list still mirrors the queue's order while shuffle is on.

## Verification

- Store tests cover the merge, the shuffled order, the removal of the current track and the foreign playlist; a detail
  test proves the read is wired to the queue.
- On the emulator: play a playlist, add a track in another client and let the live read land, then confirm the queue
  grows at the end rather than moving the current track.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
