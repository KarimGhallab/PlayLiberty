# 02: Add a video to several playlists

**Blocked by:** [`01`](01-record-the-batch-add-route-shape.md).
**Status:** resolved

## Outcome

Implemented and verified. `POST /tracks` takes a video URL and a non-empty list of at most a hundred playlist
ids, and answers one outcome per id in the order sent. `addTrackToPlaylists` resolves each playlist's
writability first, creates the track only when at least one playlist will take it, and reuses a track the
instance already holds without reading the source again. Each writable playlist gets a manual association
appended with `nextPositionFor`, and its stored count moves with it; an existing association answers
`already_present`; everything else answers `refused` as a bare pair of `playlistId` and `outcome`. The nested
`POST /playlists/:id/tracks` stub is gone.

The contract gained `AddTrackOutcome`, a reshaped `AddTrackInputSchema`, and `AddTrackResultSchema`. Validation
failures use a new `sendUnprocessable` (422) rather than the `400` the other routes use, which is the spec's
decision: the body is readable and the server still will not act on it. Four refactors made the route share
rather than copy: `resolveSourceUrl` moved to `shared/` since the sync and the batch both read it,
`canWritePlaylist` joined the access rules and the sync now uses it, `nextPositionFor` moved into the
association service, and the track upsert split into `findTrackByVideoId` and `createPendingTrack` in the
tracks service. The sync's `ensureTrack` keeps its own behaviour, re-queuing a failed track, and the shared
read is what makes that difference explicit rather than accidental.

The twelve new tests cover one track and three appended associations across three playlists, the outcome order,
a mixed batch with a read collaborator and a missing playlist refused identically, `already_present` with the
rest succeeding, the four `422` inputs with nothing created, a stored and a failed track reused untouched and
without a source read, append with an existing position left alone, the removed nested route, and the missing
client header.

Verification: `pnpm run test` (144 server tests, 12 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass. No
migration, no em dashes. Not committed.
