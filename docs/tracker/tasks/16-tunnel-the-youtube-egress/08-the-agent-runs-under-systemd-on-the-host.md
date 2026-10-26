# 08: The agent runs under systemd on the host

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [02](02-the-egress-page-shows-the-pool-and-its-state.md).

## Outcome

The agent now has a host shape. `deploy/systemd/playliberty-egress.service` is a
system-scoped unit: it creates the `playliberty-egress` namespace, the veth that
carries only the WireGuard endpoint, and `wg0`; it applies the active config with
`wg syncconf` and runs the agent with `ip netns exec`. The interface is created
once, and only an explicit stop removes it, so `Restart=on-failure` never
recreates a working interface. The host default route, sshd and the VPS address
are untouched; the host forwards only the pool's endpoint IP:port pairs from
the namespace and masquerades them out the existing route.

`deploy/egress/egress-up.sh` is idempotent. It resolves the active name from
`/var/lib/playliberty-egress/active`, then `PROTON_ACTIVE_CONFIG`, then the first
file; it writes the per-namespace resolver, disables IPv6, adds the endpoint
`/32` and the `wg0` default, and owns `/run/playliberty` as the pod's uid.
`egress-down.sh` runs only on an explicit stop. `egress.env.example` carries the
peer uid and the first-boot name.

The agent reads the same state file at startup and writes it after every
successful apply or switch, so a reboot returns to the config it had. `yt-dlp`
now passes `--force-ipv4` on both the listing and the download. The server pod
mounts `/run/playliberty` read-only, sets `YOUTUBE_TRANSPORT=egress-agent` and
keeps its security context and netns.

`pnpm deploy:build-for-production` now reads the pool read-only, runs
`wg-quick strip` and the agent's `--dry-run`, keeps the directory `0700` and the
files `0600`, extracts the server image's yt-dlp and verifies it against the
image's `org.playliberty.ytdlp.sha256` label. The `.dockerignore` keeps the dev
pool out of the image. The runbook is
[`docs/runbooks/egress-agent.md`](../../../runbooks/egress-agent.md).

Verification: `pnpm run build`, `pnpm run lint:check` and
`npx dependency-cruiser .` (352 modules) pass; suites: youtube 40, egress-agent
54, i18n 37, server 426, web 598. The deployment command's `--dry-run` prints the
full plan, and both scripts pass `bash -n`. The live install, reboot and Proton
evidence need the VPS and are recorded in
[09](09-verify-the-tunnel-against-proton.md).

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

- [x] A system-scoped unit creates the namespace, brings the interface up, and runs the agent inside it; it restarts the agent without recreating a working interface by accident.
- [x] `wg syncconf` changes the exit without touching the host default route, without recreating the interface, and with no effect on sshd or the VPS address.
- [x] The namespace has its own resolver, no global IPv6 address, and yt-dlp is forced to IPv4.
- [x] The pool directory is root-owned at `0600`; the config is never in git, the image or a Podman secret.
- [x] The socket is reachable by the pod's uid only, and the host opens no port.
- [x] The host yt-dlp is the image's binary, by the committed digest, not a second pin.
- [x] The build command checks that the pool parses and never writes it.
- [x] A reboot brings the agent back on the config it had, and the page lists the same pool.
- [x] `ARCHITECTURE.md`, `AGENTS.md` and the deployment guideline record the two scopes and the egress rule.

Verification: `pnpm run build`, `pnpm run lint`, the platform and deployment
scripts, and a reboot on the host with the agent and the loaded config intact.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
