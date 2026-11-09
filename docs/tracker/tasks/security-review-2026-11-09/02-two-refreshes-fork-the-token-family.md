# 02: Two refreshes fork the token family

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`

## Outcome

The refresh route owns one `SingleFlight` keyed by the presented token hash. A second refresh with the same token awaits the first rotation and receives the same pair. The rotation mints before the claim, so a Pangolin failure still leaves the token usable. The claim is a conditional update inside the same transaction as the replacement and the access row, so a lost race writes nothing. A lost claim with no grace pair returns the retryable `agent_unreachable`.

The route test starts two refreshes against a held mint. It proves one mint, identical pairs and one replacement. The older-token reuse test and the Pangolin failure test still pass. See [authRoutes.test.ts](../../../../apps/server/src/features/auth/routes/authRoutes/authRoutes.test.ts) and [singleFlight.ts](../../../../apps/server/src/features/auth/services/singleFlight.ts).
