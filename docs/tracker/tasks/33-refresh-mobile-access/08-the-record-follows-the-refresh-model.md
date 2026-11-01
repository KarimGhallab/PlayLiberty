# 08: The record follows the refresh model

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`07`](07-expired-credentials-are-pruned-and-the-key-can-delete.md)

## Outcome

Spec `20` now describes the pair and its two paths. Its solution exchanges the code for a short access token and a
rotating refresh token stored as one record, and names the exchange and the refresh as the two exact, method-scoped
exemptions. Stories 10, 15 and 23 follow: a refused credential, the credential paths as the only paths outside SSO,
and sign-out ending the credential at the edge. The exchange decision mints a short-lived token, answers the pair and
the first refresh token, and points at spec `33` for rotation, reuse and revocation. The record decision replaces the
"token pair" wording, the testing decision writes the session record, the lifetime disappears from the cut tests,
the out-of-scope line points refresh and revocation at `33`, and the further notes name
`MOBILE_ACCESS_TOKEN_LIFETIME_SECONDS`, `MOBILE_REFRESH_TOKEN_LIFETIME_SECONDS` and `MOBILE_FAMILY_LIFETIME_SECONDS`
as the configuration that owns the lives.

Spec `19` no longer says the app carries one token for 180 days or that it has no revocation path. Its sign-out
decision asks the server to revoke the refresh family best effort, then clears locally, and its out-of-scope line
points revocation at `33`.

`ARCHITECTURE.md` records both exemptions at the edge, the pair, silent renewal, the 30-second grace and reuse
revocation, the one credential record, and sign-out revocation. Its mobile access flow grew the renewal and
sign-out steps, and the mobile stack and provisioning paragraphs describe the record and the family instead of one
180-day token.

Spec `33` is marked resolved in its own file and in the spec tracker, whose row links this ticket set. Every other
provisioning decision stands.

## Verification

- Searches across `docs/` for the old lifetime, "the only path outside SSO", "no revocation path" and
  "re-provisions when it is refused" find no stale statement; the remaining 180-day text is spec `33`'s own record of
  the policy it replaced.
- Every relative link in the edited files resolves.
- No em dash was introduced.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
