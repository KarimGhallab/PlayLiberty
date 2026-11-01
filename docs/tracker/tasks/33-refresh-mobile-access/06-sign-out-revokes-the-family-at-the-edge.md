# 06: Sign-out revokes the family at the edge

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-reuse-cuts-the-family-off.md) and
[`04`](04-the-app-refreshes-before-the-access-token-lapses.md)

## Outcome

Signing out ends the credential at the edge, not only on the phone. `POST /api/v1/session/revoke` stays behind the
edge and is authenticated by the access token, with the refresh token in the body. The server checks that the family
belongs to the edge's account; a mismatch is a no-op success, so the endpoint reveals nothing about another account.
A match revokes the family and deletes every unexpired access token at Pangolin. The answer is `204`, including when
the family is already gone.

The reuse path shares the same server revocation, so detection and sign-out have one owner.

The app ensures it has a valid access token before calling revoke, refreshing first when necessary. It then calls
revoke best effort and clears the record, the query cache and the player. A Pangolin or network failure never blocks
the local clear, so a phone handed over while offline still loses its access at home.

## Acceptance criteria

- [ ] A signed-in account's sign-out revokes its family and deletes its unexpired access tokens at the edge.
- [ ] A body naming another account's family is a no-op that answers `204`.
- [ ] A repeated revoke answers `204`.
- [ ] The app refreshes first when its access token has lapsed, and always clears its record, cache and player even
      when the call fails.
- [ ] Deleting a token in the Pangolin UI is not a revocation channel and no such path is added.

## Verification

- Server: the revoke suite proves the owner case, the other-account no-op, the family revocation, the deletions and the
  idempotent answer, at the same HTTP seam as the exchange.
- Mobile: the sign-out suite proves the refresh-first call, the best-effort failure that still clears, and the cleared
  query cache and player.
- On `emulator-5554`, signing out returns the signed-out door and the app relaunch stays signed out.
- `pnpm run build` and `pnpm run lint:check` pass.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
