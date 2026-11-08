# 03: The exemption is one method on one path

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md), the exchange exemption.

## Outcome

The identity hook's assertion-only exemption is now `POST /auth/exchange`, not the path alone. A `GET` or `PUT` on
the same path without `Remote-User` fails closed with `401` before routing or the CSRF check.

The edge README records that the path bypass is not a method bypass: the server narrows the one path to the one
method the flow uses.

**Constraints:** Every method on the provisioning paths skips account resolution; only the identity exemption is method-scoped.

See [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md).
