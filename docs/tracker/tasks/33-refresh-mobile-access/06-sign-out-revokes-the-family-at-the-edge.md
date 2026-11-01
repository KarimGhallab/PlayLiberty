# 06: Sign-out revokes the family at the edge

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-reuse-cuts-the-family-off.md) and
[`04`](04-the-app-refreshes-before-the-access-token-lapses.md)

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

## Verification

- Server: 500 tests across 36 files. The revoke suite proves the owner's family and access row revoked with the
  Pangolin deletion, another account's family left untouched with a `204`, an unknown token and a repeated revoke both
  `204`, the missing-body validation, the unauthenticated `401`, and the allowed audit with `nothing_to_revoke` for a
  no-op and no token in the lines.
- Mobile: 502 tests across 54 suites. The session suite proves the revoke request's URL, method, access headers, User-
  Agent, client header and refresh-token body, the refresh-first call that presents the rotated token, the clear after
  an unreachable server, the clear without a record, and the absence of a revoke when the renewal ends the session. The
  store suite proves `expire` posts the revoke and clears the record and player.
- On `emulator-5554`, the account sheet's sign-out returned the signed-in door, and a kill and relaunch stayed signed
  out. The server answered `204` with a `session_revoke` allowed line, and the database showed the family and its
  access token revoked. Provisioning afterwards signed back in.
- `pnpm run build` and `pnpm run lint:check` pass.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
