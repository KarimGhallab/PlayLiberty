# 08: The agent runs under systemd on the host

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [02](02-the-egress-page-shows-the-pool-and-its-state.md).

## What to build

Make it exist on the VPS. A system-scoped unit creates the network namespace,
brings the WireGuard interface up from the active config, and runs the agent
inside it with `ip netns exec`. The pod is not touched: no `NET_ADMIN`, no route
change, no published port.

The runbook covers the pool directory, the per-namespace resolver, the socket
directory, the host yt-dlp binary taken from the built image, and the two scopes
that now exist on the host. The agent remembers the loaded config across its own
restart, so a reboot does not silently move production to the first config in
the pool.

## Acceptance criteria

- [ ] A system-scoped unit creates the namespace, brings the interface up, and runs the agent inside it; it restarts the agent without recreating a working interface by accident.
- [ ] `wg syncconf` changes the exit without touching the host default route, without recreating the interface, and with no effect on sshd or the VPS address.
- [ ] The namespace has its own resolver, no global IPv6 address, and yt-dlp is forced to IPv4.
- [ ] The pool directory is root-owned at `0600`; the config is never in git, the image or a Podman secret.
- [ ] The socket is reachable by the pod's uid only, and the host opens no port.
- [ ] The host yt-dlp is the image's binary, by the committed digest, not a second pin.
- [ ] The build command checks that the pool parses and never writes it.
- [ ] A reboot brings the agent back on the config it had, and the page lists the same pool.
- [ ] `ARCHITECTURE.md`, `AGENTS.md` and the deployment guideline record the two scopes and the egress rule.

Verification: `pnpm run build`, `pnpm run lint`, the platform and deployment
scripts, and a reboot on the host with the agent and the loaded config intact.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
