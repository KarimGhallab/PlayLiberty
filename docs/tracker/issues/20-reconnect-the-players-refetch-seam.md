# 20: Reconnect the player's refetch seam

**State:** `resolved`
**Category:** `enhancement`

## Outcome

A tracks refetch feeds the live queue, and queue construction lives in one module. A new `playerQueue` module owns construction: `buildQueue(tracks, playlist)` turns a playlist's server tracks into the queue's entries, and `startPlaylistQueue(playlist, tracks, startTrackId, shuffle)` builds and starts, returning false when there is nothing to play, with the old `playerTracks` module folded in. A new `useQueueRefetch(playlist, tracks)` hook is the refetch seam, keyed on the tracks read's data so the merge happens when the server answers again, and it hands the built queue to the store's `applyRefetch`, so a sync that appends or drops a track reaches the queue while the detail is open. `applyRefetch` and `mergeQueue` are load-bearing, and the store's guard leaves the queue alone when the refetched playlist is not the one playing.
