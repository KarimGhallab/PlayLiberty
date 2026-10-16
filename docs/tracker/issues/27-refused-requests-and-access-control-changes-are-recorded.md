# 27: Refused requests and access-control changes are recorded

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** 23. The audit must cover the edge-assertion refusal in the same pass, so the identity path is finalized first.

## Outcome

Every refusal and every access-control mutation writes one audit line. `shared/audit.ts` owns the line: `{ audit: true, action, outcome, reason?, path?, actor?, playlist?, account?, level?, role? }`, message `audit`, written at `warn` for a refusal and `info` otherwise. The identity hook writes `identity_refused` for both the missing-identity and missing-edge-assertion cases, with the path, the reason, and the identity as it arrived, and writes `role_assigned` when a request moves an existing account's role, using the new `roleChanged` flag `resolveAccount` returns; the CSRF hook writes `csrf_refused` for the missing header, the cross-site request and the origin mismatch. The share routes write `share_granted` (actor, playlist, target account, level) and `share_revoked` (actor, playlist, target account), the playlist delete writes `playlist_deleted` (actor, playlist), and the test reset writes `instance_reset`. `buildApp` gained a `loggerInstance` seam and the test context forwards it, so a test reads the lines the app writes.
