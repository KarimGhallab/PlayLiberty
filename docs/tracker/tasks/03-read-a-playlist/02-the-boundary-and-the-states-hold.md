# 02: The boundary and the states hold

**Blocked by:** [`01`](01-read-the-tracks-of-a-playlist.md).
**Status:** resolved

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
