# 09: Verify the tunnel against Proton on the host

**Status:** resolved
**Labels:** `enhancement`, `ready-for-human`

## Outcome

Closed by the operator after the live host verification against the Proton
subscription: the agent ran under `playliberty-egress.service` with five configs
in the pool and `01-FR-634` active, only the agent's traffic used the interface,
a switch reported an exit address that was not the VPS address, a real track
downloaded through the exit and landed in the store, and a fully failed pool made
a sync answer `blocked` with its pending rows intact.

The first live check exposed UFW's default routed deny policy dropping the
namespace's WireGuard packets. The host now carries explicit UFW route rules for
every endpoint, and `pnpm deploy:build-for-production` adds them when UFW is
active.

No automated test stands in for this ticket.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
