# 03: The exemption is one method on one path

**Status:** ready-for-agent
**Labels:** `bug`, `ready-for-agent`
**Source:** [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md), "the bypass reaches one path
only", and user story 15.
**Blocked by:** [`01`](01-the-provisioning-paths-write-no-account.md)

## Observed

The identity hook treats `/auth/exchange` as assertion-only for every method. A `GET /auth/exchange` with the edge
assertion and no `Remote-User` passes identity and reaches routing, where it answers `404` instead of `401`. The
server does not narrow the edge's path bypass to the one request the flow needs.

## Expected

Only `POST /auth/exchange` is exempt from identity. Every other method on the same path still needs identity and
fails closed with `401`. The edge's path bypass remains one path; the server narrows it to the one method, so a
different method cannot use the exchange's exemption.

## Evidence

The exemption is a set of paths. The route is registered for `POST` only, so a `GET` skips identity and then finds no
route.

## Acceptance criteria

- [ ] `GET /auth/exchange` with the assertion and no `Remote-User` answers `401`.
- [ ] `PUT /auth/exchange` with the assertion and no `Remote-User` answers `401`.
- [ ] `POST /auth/exchange` without `Remote-User` still exchanges.
- [ ] `POST /auth/exchange?source=app` is still exempt; the query string does not widen the exemption.
- [ ] The edge README records that the server narrows the path bypass to `POST`.

## Verification

`pnpm --filter @playliberty/server run test`. The new tests send each method through the inject seam with the
assertion and without identity; the existing exchange test stays green.
