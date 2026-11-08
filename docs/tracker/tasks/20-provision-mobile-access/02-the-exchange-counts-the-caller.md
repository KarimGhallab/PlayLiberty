# 02: The exchange counts the caller, not the proxy

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md), "applies a rate limit", and
the exchange decision.

## Outcome

The server now trusts the loopback proxy, so `request.ip` is the client address nginx forwarded. The exchange's rate
limit therefore has one bucket per caller; one caller's ten attempts no longer spend another caller's budget. A
forwarded header from a peer that is not the loopback proxy is ignored, so a direct caller cannot choose its bucket.

The new tests drive the exchange through the inject seam: two callers behind the proxy have independent buckets, and
a non-loopback peer keeps one bucket whatever its forwarded header says.

**Constraints:** The trusted proxy is `loopback`, not `true`: only the pod-local nginx may set the forwarded address.

See [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md).
