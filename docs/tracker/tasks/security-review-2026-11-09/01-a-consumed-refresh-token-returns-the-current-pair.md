# 01: A consumed refresh token returns the current pair

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`

## Outcome

The grace cache keeps one entry per refresh family, and the entry names the token that produced its pair. The cache returns the pair only when the presented token hash matches that token. An older consumed token falls through to reuse, so the family is revoked and the server answers `400 invalid_grant`. The refresh outcome carries `replayed`, and the audit line for a grace replay names `grace_replay`.

The route tests cover a latest-token replay, an older-token replay and the audit reason. See [authRoutes.test.ts](../../../../apps/server/src/features/auth/routes/authRoutes/authRoutes.test.ts).
