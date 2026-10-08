# 27: Refused requests and access-control changes are recorded

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** 23. The audit must cover the edge-assertion refusal in the same pass, so the identity path is finalized first.

## Agent Brief

**Category:** enhancement
**Summary:** Identity refusals, CSRF refusals, and the access-control mutations (share grant and revoke, playlist delete, role assignment, the test reset) leave no actor in the log, so a bad change or a refused caller cannot be reconstructed.

**Current behavior:**
The identity hook answers 401 and the CSRF hook answers 403 with no log line. Share grant and revoke, playlist delete, and the test reset log nothing. The role is derived silently on every request from the configured admin list. The only logging is the generic Fastify request line plus the worker and prune.

**Desired behavior:**
Each of these events emits one structured audit line with the actor account id, the action, the subject, and the outcome. Refusals record which identity was refused, or that none was present. Mutations record who acted and on what. The line is at info level, except refusals which are warn.

**Key interfaces:**

- The identity and CSRF hooks: the refusal points.
- The share and playlist routes, the account service, and the test reset: the mutation points.
- The logger the Fastify instance already carries.

**Acceptance criteria:**

- [x] An identity refusal and a CSRF refusal each emit a line naming the path and the outcome.
- [x] A share grant and a share revoke each emit a line naming the actor, the playlist, and the target account.
- [x] A playlist delete emits a line naming the actor and the playlist.
- [x] A role assignment that changes an account's role emits a line naming the account and the new role.
- [x] The test reset emits a line.
- [x] Tests assert the lines, at least for the refusal and the share cases.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Log shipping or retention, which is deployment.
- Auditing reads, which would be noise.
- The raw-tool-output exposure in error fields, which is a separate finding.

## Outcome

Done. Every refusal and every access-control mutation writes one audit line.

- `shared/audit.ts` owns the line: `{ audit: true, action, outcome, reason?, path?, actor?, playlist?, account?, level?, role? }`, message `audit`, written at `warn` for a refusal and `info` otherwise.
- The identity hook writes `identity_refused` for both the missing-identity and missing-edge-assertion cases, with the path, the reason, and the identity as it arrived. It also writes `role_assigned` when a request moves an existing account's role, using the new `roleChanged` flag `resolveAccount` returns.
- The CSRF hook writes `csrf_refused` for the missing header, the cross-site request, and the origin mismatch.
- The share routes write `share_granted` (actor, playlist, target account, level) and `share_revoked` (actor, playlist, target account); the playlist delete writes `playlist_deleted` (actor, playlist); the test reset writes `instance_reset`.
- `buildApp` gained a `loggerInstance` seam and the test context forwards it, so a test reads the lines the app writes.

Verification: seven integration tests cover the identity refusal, the edge-assertion refusal, the CSRF refusal, the share grant and revoke, the playlist delete, the role change, and the reset. Server suite 316; full unit suite exits 0 (tokens 3, youtube 31, i18n 39, ui-foundation 6, server 316, web 372); `pnpm run build` and `pnpm run lint` clean.

## Evidence

- `apps/server/src/app/hooks/identity/identity.ts:64-73`.
- `apps/server/src/app/hooks/csrf/csrf.ts:33-64`.
- `apps/server/src/features/shares/routes/shareRoutes.ts:99-139`.
- `apps/server/src/features/playlists/routes/playlistRoutes.ts:238-265`.
- `apps/server/src/features/accounts/accountService.ts:32-34`.
- `apps/server/src/app/testing/e2eRoutes.ts:50-70`.
- Security review 2026-10-08, finding 8.
