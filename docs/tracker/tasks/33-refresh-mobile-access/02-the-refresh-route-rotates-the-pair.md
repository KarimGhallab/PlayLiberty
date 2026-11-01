# 02: The refresh route rotates the pair

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-exchange-issues-the-pair-and-the-app-holds-one-record.md)

## Outcome

`POST /auth/refresh` is the second path outside Pangolin SSO. The identity hook treats it as assertion-only and
method-scoped: the `POST` reaches the route without identity, while `GET` and `PUT` on the same path still fail
closed with `401`. The path is in the provisioning set, so it never resolves an account.

The route hashes the presented token, finds an unconsumed, unexpired token in an unrevoked family, applies the family
rate limit, and mints a new access token before it consumes anything. It then records the new access row, issues the
replacement refresh token with its expiry clamped to the family's absolute cap, consumes the presented token and
updates the family's last use, all in one transaction. The access life is likewise clamped to the family's remaining
life, and the access title keeps the family prefix.

An unknown, consumed or expired token, or a revoked or expired family, answers `400 invalid_grant` with no detail.
Ten attempts a minute are allowed per caller and ten per family; each answers `429`. With no Integration API the
route answers `503`; a Pangolin failure answers `502` and writes nothing, so the presented token still works when the
mint recovers. The response is `Cache-Control: no-store`, and each attempt writes one `session_refresh` audit line
with its outcome, reason and the family's user, never the token.

The rate limiter is now one owner keyed per budget: the exchange spends `exchange:<caller>` and the refresh spends
`refresh:<caller>` and `family:<id>`, so the two paths and the family do not exhaust each other.

The edge rule list carries a second exact bypass, `auth/refresh`, the origin's nginx template an exact location, and
the development proxy forwards the path.

**Membership.** The documented Integration API mint answers `200` with `success: false` on a refusal and has no
membership signal; checking the resource's user list would need a permission the deployment notes do not grant. Any
mint refusal is therefore the outage answer (`502`) and leaves the family alone. A removed user is cut off by the
edge refusing the fresh access token, which `05` turns into a definitive refusal, rather than by the refresh
answering `invalid_grant`.

## Verification

- Server: 490 tests across 35 files. The refresh suite proves the rotation, the consumed row, the new access row, the
  family-prefixed title, the clamp against the family cap, the unknown, consumed, expired-token, revoked-family and
  expired-family refusals, the `503`, the `502` that preserves the token, the missing-body validation, both rate
  limits (the family one across distinct callers), the assertion-only reachability and the no-store header. The audit
  suite proves the allowed and refused lines and that neither the token nor the access secret is logged. The
  identity suite proves the `POST` reaches the route without identity and that `GET` and `PUT` answer `401`.
- Through the development proxy, `POST /auth/refresh` answered `400 invalid_grant` as problem JSON rather than the
  shell HTML or an SSO redirect.
- `pnpm run build` and `pnpm run lint:check` pass.
- A live rotation from the app is not exercised yet; the session module that calls it is `04`.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
