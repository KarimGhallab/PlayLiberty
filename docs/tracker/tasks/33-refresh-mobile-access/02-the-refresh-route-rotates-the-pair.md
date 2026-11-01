# 02: The refresh route rotates the pair

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-exchange-issues-the-pair-and-the-app-holds-one-record.md)

## Outcome

`POST /auth/refresh` becomes the second path outside Pangolin SSO. The identity hook treats it as assertion-only and
method-scoped: the `POST` reaches the route without forwarded identity, while a `GET` or `PUT` on the same path still
fails closed with `401`.

The request body is the refresh token alone. The server hashes it, finds an unconsumed, unexpired token in an
unrevoked family, and mints a new access token before it consumes the presented refresh token. Only then does it
record the new access row, issue the replacement refresh token with its expiry clamped to the family's absolute cap,
consume the old one, and answer the pair.

An unknown, expired, consumed or revoked token, or a user who is no longer a member, answers `400 invalid_grant` with
no detail. The rate limit is ten attempts a minute per caller and ten a minute per family, answering `429`. An
unconfigured integration answers `503`, and a Pangolin failure answers `502` while the presented token stays valid, so
a failed refresh never destroys the only credential the app holds. The response is `Cache-Control: no-store`, and the
outcome is audited without the token.

The path is reachable from the app's origin. The edge rule list gains a second exact bypass, `auth/refresh`, above the
SSO rule; the origin's nginx template gains its exact location; and the development proxy forwards the path so the
Android development build can refresh.

## Acceptance criteria

- [ ] `POST /auth/refresh` rotates the pair, and the old refresh token is consumed.
- [ ] The hook lets the `POST` through without identity and refuses `GET` and `PUT` on the same path.
- [ ] The refusal set, the caller and family rate limits, the `503`, and the `502` that preserves the token are all
      answered as decided.
- [ ] The new refresh token expires at the earlier of the refresh life and the family cap.
- [ ] The response is no-store and the audit line carries the outcome, never the token.
- [ ] The edge bypass is exact and above SSO, nginx has its exact location, and the development proxy forwards the
      path.

## Verification

- Server: the refresh suite runs the real app over a temporary database with a fake Pangolin client and the injected
  clock, and proves rotation, the cap clamp, the refusal set, the rate limits, the preserved token on `502`, the header
  and the audit. The hook suite proves the method-scoped exemption.
- On the development proxy, a `POST` to the path answers the pair rather than the shell HTML or an SSO redirect.
- `pnpm run build` and `pnpm run lint:check` pass.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
