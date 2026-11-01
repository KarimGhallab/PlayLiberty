# 03: Reuse cuts the family off

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-refresh-route-rotates-the-pair.md)

## Outcome

The route holds one family-level grace cache per app. A successful rotation records the family's new pair for 30
seconds; a replay of a consumed token inside that window answers the same pair, mints nothing and writes nothing. The
cache prunes older entries on write and on lookup, so a family that never replays does not hold memory indefinitely.
It is process-local by construction: a restart drops it, and a replay afterwards is reuse.

A replay outside the window is reuse. One `revokeFamily` module now owns ending a family: it deletes every unexpired
access token at Pangolin first, then marks those rows and the family revoked in one transaction. A failed deletion is
swallowed, so the family is revoked locally either way. The reuse branch drops the grace entry, answers
`invalid_grant`, and the route audits the refusal as `refresh_token_reuse`, distinct from an ordinary token refusal.
Sign-out will reuse the same module.

The Pangolin client gained the delete call: `DELETE /access-token/{id}` with the integration key as its bearer
credential, rejecting a response whose envelope says `success: false`. Its contract suite proves the method, the path
and the authorization, and that a refused deletion throws.

The rotation test no longer asserts that an immediate replay is refused: inside the window it now succeeds by design,
and the grace and late-replay tests own both halves.

## Verification

- Server: 494 tests across 35 files. The refresh suite proves the in-window replay returns the same pair with no mint
  and no new rows, the late replay revokes the family and both access rows, deletes both Pangolin ids, and audits
  `refresh_token_reuse`, and that a failed deletion still leaves the family and its rows revoked. The Pangolin client
  contract suite proves the delete request and its refusal.
- `pnpm run build` and `pnpm run lint:check` pass.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
