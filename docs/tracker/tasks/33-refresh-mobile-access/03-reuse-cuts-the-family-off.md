# 03: Reuse cuts the family off

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-refresh-route-rotates-the-pair.md)

## Outcome

A family-level, process-local cache holds the latest full refresh response for 30 seconds. A replay of a consumed
token inside that window returns the same pair instead of minting again, which covers both a lost response and a race
where two callers refresh at once.

A replay outside the window is reuse. The server revokes the family, answers `invalid_grant`, and writes its own
audit line. Revoking the family also deletes every unexpired access token issued to it at Pangolin, so detection cuts
the attacker's window immediately. The Pangolin client gains the delete call, and a failed delete is best effort: the
family is revoked locally either way.

The cache is process-local and a restart drops it, so a replay after a restart is reuse. The deployment is one
process, so no shared store is built.

## Acceptance criteria

- [ ] A replay inside the 30-second window returns the same response and mints nothing.
- [ ] A replay outside it revokes the family, deletes each unexpired access token, answers `invalid_grant`, and audits
      the reuse distinctly from an ordinary refusal.
- [ ] The delete call uses the Integration API's token deletion with the integration key, proven by a contract test.
- [ ] A failed deletion still leaves the family revoked.

## Verification

- Server: the refresh suite proves the grace replay, the reuse revocation, the deletion per unexpired token, and the
  audit line, with the fake Pangolin client recording mints and deletions.
- The Pangolin client's contract test proves the delete request's method, path and authorization.
- `pnpm run build` and `pnpm run lint:check` pass.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
