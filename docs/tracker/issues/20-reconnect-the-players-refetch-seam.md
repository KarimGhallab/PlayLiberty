# 20: Reconnect the player's refetch seam

**State:** `ready-for-agent`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The player store declares a seam that merges a server refetch into the live queue, but nothing in production calls it, so a track arriving from a sync never reaches the queue, and queue construction is spread across four files.

**Current behavior:**
`applyRefetch` and `mergeQueue` are unit-tested but only referenced by the store, the type and the tests; no production path calls them. The queue is built when playback starts (from the fetched tracks) and never merged afterward, so a track that arrives from a sync, or leaves the source, does not change the queue. The store's own comment promises the opposite: a track arriving from a sync lands at the end rather than reshuffling the queue. Queue construction itself is spread across `toPlayerTracks`, `startQueue`, the shuffle hook and two inline builders in the detail page.

**Desired behavior:**
A tracks refetch feeds the live queue through the declared seam, so a track arriving from a sync appends and a track that is gone is dropped, with the current track surviving. Queue construction lands in one module that both the play path and the shuffle path use. The behaviour when the queue is not the refetched playlist is unchanged.

**Key interfaces:**

- The seam is `applyRefetch(playlistId, tracks)`; the read hook's data feeds it.
- The queue module builds a queue from tracks and a playlist; `toPlayerTracks`, `startQueue` and the shuffle hook use it.
- The current id survives the merge, which is the store's stated promise.

**Acceptance criteria:**

- [ ] A tracks refetch for the playing playlist merges into the live queue: a new track appends, a removed track drops, the current track survives.
- [ ] Queue construction happens in one module, used by the play path and the shuffle path.
- [ ] The queue is unchanged when the refetched playlist is not the one playing.
- [ ] `applyRefetch` is called in production; it is no longer dead code.
- [ ] Tests cover the merge through the seam and the queue construction; the existing player tests keep passing.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The invalidation map (issue 19), which decides when a refetch happens.
- Offline playback or queue persistence changes.
- Virtualization.

## Observed

- `applyRefetch`/`mergeQueue` are referenced only in the store, the type and the tests.
- `PlaylistDetailPage` builds queues inline twice; `useShufflePlaylist` builds one.
- The store comment promises a merge that no path performs.

## Expected

A refetch merges into the live queue, and queue construction lives in one module.

## Evidence

- Repo-wide grep for `applyRefetch`/`mergeQueue`: no production caller.
- Architecture review, candidate 5, "Reconnect the player's refetch seam".
