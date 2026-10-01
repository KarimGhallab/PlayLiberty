# 04: What a share grants

**What to build:** The two levels, proved through the routes rather than asserted on the share row. A read
collaborator sees the playlist in the library and reads it and its tracks, and the stream and the thumbnail
answer with the track's state rather than a refusal; every mutating route refuses it. A write collaborator adds
a video, removes a track, retries a failed one and syncs, and rename, delete and all three share routes refuse
it, because managing shares is ownership. A non-collaborator is refused the share routes and answers `404` for
the playlist itself. Sharing copies nothing: it creates no second track, moves no count, stores no second file,
and a sync leaves a share alone.

**Blocked by:** [`02`](02-list-and-grant-shares-on-a-playlist.md), [`03`](03-revoke-a-share.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A read collaborator sees the playlist in the library, reads it and its tracks, and reaches the stream and the thumbnail rather than being refused.
- [x] Every mutating route refuses a read collaborator.
- [x] A write collaborator adds a video, removes a track, retries a failed track and syncs.
- [x] Rename, delete and all three share routes refuse a write collaborator.
- [x] A non-collaborator is refused the share routes and answers `404` for the playlist.
- [x] Sharing creates no second track, changes no count and stores no second file.
- [x] A sync of a shared playlist leaves the share in place.

## Outcome

Verified with tests; no production change was needed. The seven new tests in `shareAccess.test.ts` prove the
matrix through the routes rather than the share row.

A read collaborator lists the playlist, reads it and its tracks, and the stream serves the bytes; every one of
the nine mutating routes is refused. A write collaborator adds a video, removes a track, retries a failed one
and syncs, and the five owner-only routes (rename, delete, and the three share routes) are refused. A
non-collaborator gets `404` for the playlist and for all three share routes. Sharing leaves the track count,
the association count and the single stored file untouched, and a sync leaves the share in place and the
playlist readable.

Two shape notes the matrix had to encode. The batch add answers `200` with a per-playlist outcome, so a refusal
there is an outcome of `refused` rather than a status code, and the test normalises it so the matrix reads as
one table. And the stream and thumbnail are track routes: for a track the account can reach they answer with
the track's state, and only the read collaborator case is asserted here, since the `403` a revoked share
produces is ticket 03's.

Writing the matrix surfaced no defect: all nine refusals were already the intended `404`, and the write
collaborator's four capabilities worked through the existing routes.

Verification: `pnpm run test` (197 server tests, 7 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass. No
migration, no em dashes. Not committed.
