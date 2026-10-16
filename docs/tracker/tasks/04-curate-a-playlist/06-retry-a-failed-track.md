# 06: Retry a failed track

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Implemented and verified. `POST /tracks/:id/retry` answers `200` with the updated track. `retryTrackForAccount`
checks a new `canAccountWriteTrack`, which is the owner of a playlist that holds the track or a write
collaborator on one and not a read collaborator, so the right follows the track rather than the playlist. A
missing track, a track no writable playlist holds and one the caller can only read are the same `404`. Only a
`failed` track is retryable; `unavailable`, `stored`, `pending` and `downloading` all answer `409` and are left
alone. The update writes `pending`, clears the failure reason and touches no run, so no sync starts.

`toTrackView` moved from the playlists service into the tracks service, because two features now need a track
as the contract sees it, and the playlists service imports it rather than keeping a second copy. `trackRoutes`
no longer imports `sendNotImplemented`, because its last stub is implemented.

The nine new tests cover the owner retry with the row read back at `pending` and no reason, a write
collaborator retrying a track held by a playlist they can write, no run created, the four non-retryable states
each refused and unchanged, the read collaborator, stranger, orphan and missing cases each answering `404`
with the failed track untouched, and the missing client header.

Verification: `pnpm run test` (170 server tests, 9 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` pass. No
migration, no em dashes. Not committed.
