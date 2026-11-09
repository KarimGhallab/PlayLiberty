# 03: Sign-out reports success while the edge token lives

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`

## Outcome

A failed edge delete no longer reports success. Sign-out answers 502, keeps the family and its access tokens revoked locally, and writes one `revocation_failed` line per token with the family id and the token id. The access token row gains `edge_deleted_at`: a confirmed delete sets it, and a pending row is retried at boot and every 60 seconds. The retry stops at the token's expiry. A 404 from the edge counts as done, so a retry terminates.

The reuse path still answers `invalid_grant` and writes the same failure line. A successful sign-out keeps 204 and one allowed line.

The tests cover the sign-out failure and retry, the reuse failure and retry, and the idempotent delete. See [sessionRoutes.test.ts](../../../../apps/server/src/features/auth/routes/sessionRoutes/sessionRoutes.test.ts), [authRoutes.test.ts](../../../../apps/server/src/features/auth/routes/authRoutes/authRoutes.test.ts), [PangolinClient.test.ts](../../../../apps/server/src/features/auth/pangolin/PangolinClient.test.ts), and migration [0009_cool_tinkerer.sql](../../../../apps/server/drizzle/0009_cool_tinkerer.sql).
