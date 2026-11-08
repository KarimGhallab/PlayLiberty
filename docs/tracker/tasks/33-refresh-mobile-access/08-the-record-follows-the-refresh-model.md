# 08: The record follows the refresh model

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

Spec `20` now describes the pair and its two paths: its solution exchanges the code for a short access token and a
rotating refresh token stored as one record, names the exchange and the refresh as the two exact, method-scoped
exemptions, and its out-of-scope line points refresh and revocation at `33`. The exchange decision mints the pair and
points at spec `33` for rotation, reuse and revocation; the failure decision returns to the app with one sentence. The
credential lifetimes are configuration, owned by
`apps/server/src/platform/config/loadConfig/loadConfig.ts` and spec `33`.

Spec `19` no longer says the app carries one token for 180 days or that it has no revocation path. Its sign-out
decision asks the server to revoke the refresh family best effort, then clears locally, and its out-of-scope line
points revocation at `33`.

`ARCHITECTURE.md` records both exemptions at the edge, the pair, silent renewal, the 30-second grace and reuse
revocation, the one credential record, and sign-out revocation. Its mobile access flow grew the renewal and
sign-out steps, and the mobile stack and provisioning paragraphs describe the record and the family instead of one
180-day token.

Spec `33` is marked resolved in its own file and in the spec tracker, whose row links this ticket set. Every other
provisioning decision stands.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
