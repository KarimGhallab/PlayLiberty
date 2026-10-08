# 27: Refused requests and access-control changes are recorded

**State:** `ready-for-agent`
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

- [ ] An identity refusal and a CSRF refusal each emit a line naming the path and the outcome.
- [ ] A share grant and a share revoke each emit a line naming the actor, the playlist, and the target account.
- [ ] A playlist delete emits a line naming the actor and the playlist.
- [ ] A role assignment that changes an account's role emits a line naming the account and the new role.
- [ ] The test reset emits a line.
- [ ] Tests assert the lines, at least for the refusal and the share cases.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Log shipping or retention, which is deployment.
- Auditing reads, which would be noise.
- The raw-tool-output exposure in error fields, which is a separate finding.

## Evidence

- `apps/server/src/app/hooks/identity/identity.ts:64-73`.
- `apps/server/src/app/hooks/csrf/csrf.ts:33-64`.
- `apps/server/src/features/shares/routes/shareRoutes.ts:99-139`.
- `apps/server/src/features/playlists/routes/playlistRoutes.ts:238-265`.
- `apps/server/src/features/accounts/accountService.ts:32-34`.
- `apps/server/src/app/testing/e2eRoutes.ts:50-70`.
- Security review 2026-10-08, finding 8.
