# 02: Add a video to several playlists

**What to build:** A listener pastes a single video URL, chooses the playlists it belongs in, and one request
adds it to all of them. The request carries the video URL and a non-empty list of at most a hundred playlist
ids, and answers one outcome per id, in the order the ids were sent, so a client can report against the list
the user chose from. For each playlist the account can write, the video becomes a manual association appended
at the end, and the playlist's track count moves with it; a playlist that already holds the video reports
`already_present`, which is a success because the end state is the one the user asked for. A playlist the
account cannot write, one that does not exist, one that was deleted, or one whose share was revoked reports
`refused`, and the four are indistinguishable, because the batch must not become a way to learn which playlist
ids exist. The video is resolved once through the adapter and one track results: a video the instance has never
seen becomes one track in `pending`, and one it already holds is reused untouched, whatever state it is in. A
playlist URL, an empty list, a malformed URL or more than a hundred ids refuses the whole request with `422`
and creates no association and no track. The stubbed nested add route goes away.

**Blocked by:** [`01`](01-record-the-batch-add-route-shape.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] One request naming three writable playlists adds one track and three manual associations, each appended at the end, and each playlist's track count moves by one.
- [x] The result carries one outcome per chosen playlist, in the order the ids were sent.
- [x] A playlist that already holds the video reports `already_present`, and the rest of the batch still succeeds.
- [x] A read collaborator's playlist is `refused` while a writable one in the same request is `added`.
- [x] A playlist that does not exist is `refused` with the same shape as a refused writable one, so the two cannot be told apart.
- [x] A playlist URL refuses the whole request with `422`, and no association and no track is created anywhere.
- [x] An empty list, a malformed URL, and more than a hundred ids are each refused with `422`.
- [x] A video the instance already holds produces one track and no second fetch, and an existing `stored` or `failed` track is left untouched rather than re-queued.
- [x] An existing association's position is unchanged and a new one is appended.
- [x] The nested per-playlist add route and its input schema are removed.
- [x] The request is refused without the client header.

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
