# 07: An operator can switch an exit by hand

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [06](06-five-failures-rotate-the-exit.md).

## What to build

The override. The switch mechanism already exists for rotation; this ticket gives
it a surface. An admin picks a config, the agent performs the same bounded drain
and `wg syncconf`, and the page shows the active marker move.

Switching to a config marked `failed` is a statement that the stored failure is
stale: the row returns to `unknown` and its counter to zero, because the
operator's choice is newer information than the stored verdict.

## Acceptance criteria

- [ ] The admin route switches the pool to the named config and answers the updated pool.
- [ ] The active row's switch control is disabled; any other row's is available.
- [ ] The control is in-flight while switching, cannot be pressed twice, and a failure leaves the active row unchanged rather than optimistic.
- [ ] Switching to a failed config resets it to `unknown` and clears its counter.
- [ ] A switch the agent refuses, because the name is unknown or the interface is down, leaves the active row unchanged and says so.
- [ ] Only an admin can switch; a non-admin gets not-found; the mutation carries the client header and passes the origin checks.

Verification: `pnpm run build`, `pnpm run lint`, the server and web suites, and a
recorded switch from the active config to a failed one with the row reset.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
