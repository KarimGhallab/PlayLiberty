# 02: The boundary and the states hold

**What to build:** The same route held against the cases a screen depends on. An owner, a read collaborator
and a write collaborator each receive the playlist's tracks; a playlist owned by another account with no share,
and a revoked share, each answer `404`, the same answer as never having had one. Every track is returned
faithfully whatever its state: each file status and source status comes back as stored, including
`unavailable` and a failed track with its reason, and a track with no thumbnail and no duration comes back with
both null rather than with the keys absent. The failure reason is returned as stored and not truncated, because
presenting it within the row is the design system's job and a truncated reason is one the user cannot act on.

**Blocked by:** [`01`](01-read-the-tracks-of-a-playlist.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] An owner, a read collaborator and a write collaborator each receive the playlist's tracks.
- [x] A playlist owned by another account with no share answers `404`.
- [x] A revoked share answers `404` from that moment, the same answer as never having had one.
- [x] Every file status and source status in the glossary's table is returned faithfully, including `unavailable` and a failed track with its reason.
- [x] A track with a null thumbnail and a null duration is returned with both null rather than omitted.
- [x] A failure reason is returned as stored rather than truncated.

## Outcome

Verified with tests; no production change was needed. The route built in ticket 01 already resolves access
through the same helper the playlist reads use, so an owner and either collaborator level receive the page and
an account with no share, including one whose share was revoked, gets the same `404`. The view copies
`fileStatus`, `sourceStatus`, `failureReason`, `thumbnailPath` and `durationSeconds` straight from the row, so
every state and every null crosses the wire unchanged. The other-account `404` this ticket lists was already
pinned by ticket 01's test, which uses exactly that case.

The fourteen new tests pin the owner and both collaborator levels, revocation, both source states, all five
file states, a failed track's reason, a three-hundred-character reason returned whole, and the two nulls as
present keys rather than absent ones. The seed helper now carries a title, a duration, a thumbnail path and a
failure reason so a case can put a track in the state it is about.

Verification: `pnpm run test` (132 server tests, 14 new), `pnpm run build`, `pnpm run lint`,
`npx depcruise .`, `npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and
`pnpm run design:check` pass. No em dashes. Not committed.
