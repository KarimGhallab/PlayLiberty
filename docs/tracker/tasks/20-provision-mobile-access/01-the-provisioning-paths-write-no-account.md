# 01: The provisioning paths write no account

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md), the provisioning route.

## Outcome

The identity hook now records the edge-forwarded user id before account resolution and stops there for the two
provisioning paths. `/provision` mints its code for that id, and `/auth/exchange` mints its token for the id the code
carries; neither creates or refreshes an account. Every other route still resolves and refreshes the account.

The route tests cover a first-time user, an existing row left untouched, an unlisted redirect, an unavailable issuer,
and an exchange with no account row. The identity tests cover creation and refresh on a normal route.

See [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md).
