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

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] Creating, renaming and deleting a playlist publish events that reach every account that can see it.
- [x] Adding, removing and retrying a track publish an event that invalidates the playlist's tracks and the
      library's counts.
- [x] A deleted playlist is removed from the client cache, and a second tab loses it without a reload.
- [x] The invalidation map the spec names is pinned by tests: creating, syncing, renaming, deleting, the batch
      add, remove, retry and share each invalidate the reads they changed.
- [x] An e2e test drives two browser contexts and asserts a rename in one appears in the other without a reload.
- [x] Build, lint and the suites pass.

## Outcome

Implemented and verified. The playlist and track features are now publishers, and the invalidation map is
pinned mutation by mutation.

Two decisions worth naming.

The publishers live in one place, `shared/events/liveEvents.ts`: `publishPlaylistChanged`,
`publishPlaylistRemoved`, `publishTrackChanged` and `publishTracksChangedForPlaylists`. A feature says what
changed and the module applies the audience rule, so the sync service and the download worker now share the
publishers ticket 01 and ticket 02 had written privately. A removal is its own shape: the track outlives the
association, so the removed playlist is named directly rather than resolved from the track, which would have
dropped it. The deletion's audience is captured before the row is gone, because there is nothing left to read
afterwards.

The context carries the bus, and the test context builds it, so a route test subscribes and observes what a
handler published. `AppOptions.events` is the seam; a real process still gets one built in `buildApp`.

Tests: six in the server's `liveEvents.test.ts` over the real routes (a rename reaches the owner, a rename
reaches a collaborator and not a stranger, a removal reaches the owner and a collaborator, an add, a remove,
and a retry each publish a track change), one in the web's `liveEvents.test.ts` for the removed mapping, nine
in `mutationInvalidation.test.tsx` pinning the map, and one e2e that drives two browser contexts and asserts a
rename in one appears in the other without a reload. The share handler fixture was missing the account's email
and role, so the grant test could not have parsed a success; that is fixed.

Verification: `pnpm run build`, `pnpm run lint`, `pnpm test:unit` (server 269, web 303, packages green) and
`pnpm --filter @playliberty/e2e exec playwright test` (26 passed, 1.3m) all pass. No em dashes. Not committed.
