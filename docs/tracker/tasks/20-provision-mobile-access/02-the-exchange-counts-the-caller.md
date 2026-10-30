# 02: The exchange counts the caller, not the proxy

**Status:** ready-for-agent
**Labels:** `bug`, `ready-for-agent`
**Source:** [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md), "applies a rate limit", and
user story 14.
**Blocked by:** None. Can start immediately.

## Observed

The server does not trust its loopback proxy, so `request.ip` is the proxy's address for every request. In production
nginx and the server share the pod, so every caller is `127.0.0.1`. The exchange therefore has one bucket: ten
attempts from one caller refuse everyone else for the rest of the minute.

## Expected

The limit counts the client address the loopback proxy forwarded. A forwarded header from a peer that is not the
trusted proxy does not change the key. Each caller gets ten attempts a minute, and one caller cannot spend another
caller's budget.

## Evidence

A probe sent ten exchange attempts with `X-Forwarded-For: 203.0.113.1` and the first with `203.0.113.2`; the second
answered `429`. The socket address was the same for both because the proxy and the server share the pod.

## Acceptance criteria

- [ ] Two callers behind the proxy have independent buckets: the first caller's eleventh attempt is `429` while the
      second caller's first attempt still exchanges.
- [ ] A forwarded header from a peer that is not the trusted proxy does not change the key.
- [ ] A caller still answers `429` after ten attempts in one minute.
- [ ] The existing threshold test stays green.

## Verification

`pnpm --filter @playliberty/server run test`. The new tests drive the exchange through the inject seam with a
`remoteAddress` and an `X-Forwarded-For` value.
