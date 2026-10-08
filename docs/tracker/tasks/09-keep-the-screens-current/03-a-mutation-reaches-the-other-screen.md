# 03: A mutation reaches the other screen and the other account

**Blocked by:** [`01`](01-the-stream-and-a-playlists-sync-progress.md),
**Status:** resolved

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
