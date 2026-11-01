# 07: Expired credentials are pruned and the key can delete

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-reuse-cuts-the-family-off.md)

## Outcome

The weekly prune also removes expired credential rows: families, refresh tokens and access tokens whose expiry has
passed. The database therefore stops growing once a family ends by the idle window or the cap.

The production Integration API key needs the delete action as well as generation, because sign-out and reuse delete
access tokens at the edge. The deployment notes record that permission, and record the three lifetimes as
configuration with their defaults. No build-time Pangolin call is added, and the secret's creation stays as it is.

## Acceptance criteria

- [ ] The weekly pass removes expired family, refresh-token and access-token rows.
- [ ] The prune reports what it removed and leaves unexpired rows alone.
- [ ] The deployment notes name the delete permission on the Integration API key and the three lifetime values.
- [ ] No build-time Pangolin call is introduced.

## Verification

- Server: the prune suite runs a pass over expired and live rows with the injected clock and proves only the expired
  ones are removed.
- The deployment notes are read against the Pangolin Integration API's key permissions.
- `pnpm run build` and `pnpm run lint:check` pass.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
