# 09: Verify the tunnel against Proton on the host

**Status:** open
**Labels:** `enhancement`, `ready-for-human`
**Blocked by:** [03](03-an-admin-can-probe-an-exit.md), [05](05-a-track-downloads-through-the-tunnel.md), [06](06-five-failures-rotate-the-exit.md), [07](07-an-operator-can-switch-an-exit-by-hand.md), [08](08-the-agent-runs-under-systemd-on-the-host.md).

## What to build

The only proof that matters, and the one no test can stand in for: the tunnel
against the real service, on the real host, with the real subscription. Record
the evidence in this ticket.

## Acceptance criteria

- [ ] The direct listing fails from the VPS address and the tunnelled listing succeeds, both recorded.
- [ ] The interface's counters show only the agent's traffic, and the host default route and sshd are unchanged throughout.
- [ ] A probe reports `ok` with an exit address that is not the VPS address.
- [ ] A real track downloads through the exit and lands in the store.
- [ ] A forced switch moves the active config, and the next listing or download uses the new exit.
- [ ] Five forced exit failures rotate to the next config, and a fully failed pool makes a sync answer `blocked` while the pending rows survive.
- [ ] The gallery says the source is unreachable during the blocked pass, and nothing in the run leads with yt-dlp's stderr.
- [ ] The evidence is recorded here, and any decision this ticket had to make is noted for the spec.

Verification: the record itself, with the commands and their outputs.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
