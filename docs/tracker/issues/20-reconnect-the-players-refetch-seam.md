# 20: Reconnect the player's refetch seam

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

Done. A tracks refetch feeds the live queue, and queue construction lives in one module.

- A new `playerQueue` module owns construction. `buildQueue(tracks, playlist)` turns a playlist's server tracks into the queue's entries (the old `toPlayerTracks`, now taking the playlist rather than an id and a name), and `startPlaylistQueue(playlist, tracks, startTrackId, shuffle)` builds and starts, returning false when there is nothing to play. The detail's row press and header play call it, and the shuffle control calls it and refuses on false; the store's `startQueue` is now reached only through it. The `playerTracks` module is gone, folded into this one.
- A new `useQueueRefetch(playlist, tracks)` hook is the refetch seam. The tracks read's data is its dependency, so the merge happens when the server answers again, not on every render, and it hands the built queue to the store's `applyRefetch`. The detail page calls it with `playlist.data` and `tracks.data`, so a sync that appends or drops a track reaches the queue while the detail is open.
- `applyRefetch` and `mergeQueue` are load-bearing: the store's promise that a track arriving from a sync lands at the end, and a gone track drops with the current one surviving, is now performed in production. The store's own guard still leaves the queue alone when the refetched playlist is not the one playing.

Tests: `playerQueue.test.ts` covers the build (stored-only, playlist stamped, remote-removed kept) and the start (pressed track, first playable, shuffled, the empty refusal), moved from the `playerTracks` test. `useQueueRefetch.test.tsx` covers the seam: a new track appends with the current one surviving, a removed track drops, another playlist's queue is left alone, and a pending read does nothing. The existing player store, bar and audio tests are unchanged and pass.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (web 391, server 318, i18n 39, ui-foundation 6, youtube 31, tokens 3) pass. Not committed.
