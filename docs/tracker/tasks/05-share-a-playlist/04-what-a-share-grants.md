# 04: What a share grants

**Status:** resolved

## Outcome

Verified with tests; no production change was needed. The seven new tests in `shareAccess.test.ts` prove the matrix through the routes rather than the share row: a read collaborator lists the playlist, reads it and its tracks, and the stream serves the bytes, while every one of the nine mutating routes is refused; a write collaborator adds a video, removes a track, retries a failed one and syncs, while the five owner-only routes (rename, delete, and the three share routes) are refused; a non-collaborator gets `404` for the playlist and for all three share routes. Sharing leaves the track count, the association count and the single stored file untouched, and a sync leaves the share in place and the playlist readable. The batch add answers `200` with a per-playlist outcome, so a refusal there is an outcome of `refused` rather than a status code and the test normalises it so the matrix reads as one table, and the stream and thumbnail are track routes with only the read collaborator case asserted here. Writing the matrix surfaced no defect: all nine refusals were already the intended `404`, and the write collaborator's four capabilities worked through the existing routes.

See [`05-share-a-playlist`](../../specs/05-share-a-playlist.md).
