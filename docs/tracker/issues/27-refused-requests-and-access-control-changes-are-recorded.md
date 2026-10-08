# 27: Refused requests and access-control changes are recorded

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** 23. The audit must cover the edge-assertion refusal in the same pass, so the identity path is finalized first.

## Outcome

Done. Every refusal and every access-control mutation writes one audit line.

- `shared/audit.ts` owns the line: `{ audit: true, action, outcome, reason?, path?, actor?, playlist?, account?, level?, role? }`, message `audit`, written at `warn` for a refusal and `info` otherwise.
- The identity hook writes `identity_refused` for both the missing-identity and missing-edge-assertion cases, with the path, the reason, and the identity as it arrived. It also writes `role_assigned` when a request moves an existing account's role, using the new `roleChanged` flag `resolveAccount` returns.
- The CSRF hook writes `csrf_refused` for the missing header, the cross-site request, and the origin mismatch.
- The share routes write `share_granted` (actor, playlist, target account, level) and `share_revoked` (actor, playlist, target account); the playlist delete writes `playlist_deleted` (actor, playlist); the test reset writes `instance_reset`.
- `buildApp` gained a `loggerInstance` seam and the test context forwards it, so a test reads the lines the app writes.

Verification: seven integration tests cover the identity refusal, the edge-assertion refusal, the CSRF refusal, the share grant and revoke, the playlist delete, the role change, and the reset. Server suite 316; full unit suite exits 0 (tokens 3, youtube 31, i18n 39, ui-foundation 6, server 316, web 372); `pnpm run build` and `pnpm run lint` clean.
