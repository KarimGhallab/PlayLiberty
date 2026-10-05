# 03: A mutation reaches the other screen and the other account

**What to build:** A rename, a delete, a track add, a track removal or a retry shows its result at once, and a
second tab or a collaborator's library sees it too. The playlist and track features publish to the bus when
they change a playlist or an association, naming the owner and every collaborator, so the audience is the
accounts that can see the playlist rather than the caller alone. The client's invalidation map is completed and
pinned by tests: the map the spec names, with a deleted playlist removed from the cache rather than left to
answer, and a track event invalidating the playlist whose counts moved. Reuses the bus, route and stream from
[ticket 01](01-the-stream-and-a-playlists-sync-progress.md) and the track producer from
[ticket 02](02-a-tracks-download-state-reaches-the-detail.md).

**Blocked by:** [`01`](01-the-stream-and-a-playlists-sync-progress.md),
[`02`](02-a-tracks-download-state-reaches-the-detail.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] Creating, renaming and deleting a playlist publish events that reach every account that can see it.
- [ ] Adding, removing and retrying a track publish an event that invalidates the playlist's tracks and the
      library's counts.
- [ ] A deleted playlist is removed from the client cache, and a second tab loses it without a reload.
- [ ] The invalidation map the spec names is pinned by tests: creating, syncing, renaming, deleting, the batch
      add, remove, retry and share each invalidate the reads they changed.
- [ ] An e2e test drives two browser contexts and asserts a rename in one appears in the other without a reload.
- [ ] Build, lint and the suites pass.
