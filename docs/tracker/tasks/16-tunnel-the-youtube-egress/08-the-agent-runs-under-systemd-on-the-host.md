# 08: The agent runs under systemd on the host

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The agent has a host shape. `deploy/systemd/playliberty-egress.service` is a
system-scoped unit that creates the namespace and runs the agent with
`ip netns exec`; `deploy/egress/egress-up.sh` is idempotent and resolves the
active name, writes the per-namespace resolver, disables IPv6, adds the endpoint
`/32` and the `wg0` default, and owns `/run/playliberty` as the pod's uid.
`egress-down.sh` runs only on an explicit stop.

`pnpm deploy:build-for-production` gained the host preparations described in
[the architecture record](../../../ARCHITECTURE.md#the-youtube-egress-runs-in-a-host-network-namespace),
and the `.dockerignore` keeps the development pool out of the image. The host
steps are in [`docs/runbooks/egress-agent.md`](../../../runbooks/egress-agent.md).

The live install, reboot and Proton evidence are recorded in
[09](09-verify-the-tunnel-against-proton.md).

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
