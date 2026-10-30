# 02: The exchange counts the caller, not the proxy

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md), "applies a rate limit", and
user story 14.
**Blocked by:** None. Can start immediately.

## Outcome

The server now trusts the loopback proxy, so `request.ip` is the client address nginx forwarded. The exchange's rate
limit therefore has one bucket per caller; one caller's ten attempts no longer spend another caller's budget. A
forwarded header from a peer that is not the loopback proxy is ignored, so a direct caller cannot choose its bucket.

The new tests drive the exchange through the inject seam: two callers behind the proxy have independent buckets, and
a non-loopback peer keeps one bucket whatever its forwarded header says. The existing eleventh-attempt test stays
green.

## Verification

- Server 460 tests across 33 suites, `tsc -p tsconfig.json --noEmit`, `pnpm run build` and `pnpm run lint:check`
  pass.
- The two new tests use `remoteAddress` and `X-Forwarded-For`; the first fails without the trust setting.

## Notes

- The trust is `loopback`, not `true`: only the pod-local nginx is trusted to set the forwarded address.

See [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md).
