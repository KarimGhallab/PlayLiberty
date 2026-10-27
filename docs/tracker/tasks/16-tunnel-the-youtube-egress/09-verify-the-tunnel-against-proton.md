# 09: Verify the tunnel against Proton on the host

**Status:** resolved
**Labels:** `enhancement`, `ready-for-human`
**Blocked by:** [03](03-an-admin-can-probe-an-exit.md), [05](05-a-track-downloads-through-the-tunnel.md), [06](06-five-failures-rotate-the-exit.md), [07](07-an-operator-can-switch-an-exit-by-hand.md), [08](08-the-agent-runs-under-systemd-on-the-host.md).

## Outcome

Closed by the operator after the live host verification against the Proton
subscription. The agent ran under `playliberty-egress.service` with the five
configs in the pool and `01-FR-634` active. The first live check exposed UFW's
default routed deny policy dropping the namespace's WireGuard packets; the host
now carries explicit UFW route rules for every endpoint, and
`pnpm deploy:build-for-production` adds them when UFW is active.

The acceptance checks below were run on the VPS and recorded as done by the
operator. No automated test stands in for this ticket.

## What to build

The only proof that matters, and the one no test can stand in for: the tunnel
against the real service, on the real host, with the real subscription. Record
the evidence in this ticket.

## Acceptance criteria

- [x] The direct listing fails from the VPS address and the tunnelled listing succeeds, both recorded.
- [x] The interface's counters show only the agent's traffic, and the host default route and sshd are unchanged throughout.
- [x] A switch reports `ok` with an exit address that is not the VPS address.
- [x] A real track downloads through the exit and lands in the store.
- [x] A switch of a standby moves the active config, and the next listing or download uses the new exit.
- [x] Five exit failures rotate to the next config, and a fully failed pool makes a sync answer `blocked` while the pending rows survive.
- [x] The gallery says the source is unreachable during the blocked pass, and nothing in the run leads with yt-dlp's stderr.
- [x] The evidence is recorded here, and any decision this ticket had to make is noted for the spec.

Verification: the record itself, with the commands and their outputs.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
