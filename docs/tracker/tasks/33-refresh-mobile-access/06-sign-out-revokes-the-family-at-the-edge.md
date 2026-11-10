# 06: Sign-out revokes the family at the edge

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`POST /api/v1/session/revoke` is the sign-out endpoint. It stays behind the edge, so the access token in the headers
is what authenticates the caller; the body names the family by its current refresh token.

The server looks the token's family up by hash and compares its Pangolin user with the edge's account. A match revokes
the family through the same `revokeFamily` module that reuse uses, so every unexpired access token is deleted at
Pangolin and the family and its rows are marked. A mismatch, an unknown token and a repeated call are all a `204`
no-op, so the endpoint reveals nothing about another account. `revokeFamily` now accepts a null Pangolin client for an
instance without the integration and still ends the rows locally.

Each attempt writes one `session_revoke` audit line with the account and an allowed outcome, adding
`nothing_to_revoke` when the token matched nothing. The response itself never carries the outcome.

The app's `Session.signOut` first ensures a valid access pair through the same margin logic, so a lapsed access token
is refreshed before the call and the rotated refresh token is the one presented. It then posts the revoke with the
access headers, the client header and the Android User-Agent, ignores the answer, and always clears the record. A
network or server failure is swallowed; the local clear is what a handed-over phone needs.

`useSessionStore.expire` now calls `signOut` instead of clearing directly, then clears the player and sets the status.
The query cache clears through the existing status-driven `SessionCache`.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
