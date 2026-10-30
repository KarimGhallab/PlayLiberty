# 03: The exemption is one method on one path

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md), "the bypass reaches one path
only", and user story 15.
**Blocked by:** [`01`](01-the-provisioning-paths-write-no-account.md)

## Outcome

The identity hook's assertion-only exemption is now `POST /auth/exchange`, not the path alone. A `GET` or `PUT` on
the same path without `Remote-User` fails closed with `401` before routing or the CSRF check. `POST /auth/exchange`
remains exempt, with or without a query string, and the existing exchange test stays green.

The edge README records that the path bypass is not a method bypass: the server narrows the one path to the one
method the flow uses.

## Verification

- Server 463 tests across 33 suites, `tsc -p tsconfig.json --noEmit`, `pnpm run build` and `pnpm run lint:check`
  pass.
- The new tests send `GET` and `PUT` through the inject seam with the assertion and without identity, and a `POST`
  with a query string.

## Notes

- The provisioning paths still skip account resolution for every method, so any method on the exchange path writes no
  account; only the identity exemption is method-scoped.

See [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md).
