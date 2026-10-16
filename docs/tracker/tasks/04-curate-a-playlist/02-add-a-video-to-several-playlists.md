# 02: Add a video to several playlists

**Status:** resolved

## Outcome

Implemented and verified. `POST /tracks` takes a video URL and a non-empty list of at most a hundred playlist ids, and answers one outcome per id in the order sent: each writable playlist gets a manual association appended with `nextPositionFor` and its stored count moves with it, an existing association answers `already_present`, and everything else answers `refused` as a bare pair of `playlistId` and `outcome`. `addTrackToPlaylists` resolves each playlist's writability first, creates the track only when at least one playlist will take it, and reuses a track the instance already holds without reading the source again; the nested `POST /playlists/:id/tracks` stub is gone. Validation failures use a new `sendUnprocessable` (422) rather than the `400` the other routes use, the contract gained `AddTrackOutcome`, a reshaped `AddTrackInputSchema` and `AddTrackResultSchema`, and four refactors made the route share rather than copy: `resolveSourceUrl` moved to `shared/`, `canWritePlaylist` joined the access rules, `nextPositionFor` moved into the association service, and the track upsert split into `findTrackByVideoId` and `createPendingTrack`. The twelve new tests cover one track and three appended associations across three playlists, the outcome order, a mixed batch with a read collaborator and a missing playlist refused identically, the four `422` inputs with nothing created, and reuse of a stored and a failed track without a source read.

See [`04-curate-a-playlist`](../../specs/04-curate-a-playlist.md).
