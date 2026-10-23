# 03: An admin can probe an exit

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [02](02-the-egress-page-shows-the-pool-and-its-state.md).

## What to build

Turn the pool page from a list into evidence. A probe reads the latest handshake,
runs one listing extraction inside the namespace, asks the exit for its own
address, and reports the three facts. The server stores the outcome on the
config's row; the page shows it.

The spec gives `probe` an optional config name, which forces a decision: only one
interface exists, so probing a standby means loading it first. A probe of a
non-active config therefore switches to it and then probes, and the page shows
the active marker having moved. That is the same act as the manual switch in
ticket 07, so the drain path is built once and both callers use it.

## Acceptance criteria

- [ ] `probe` with no name probes the loaded config; with a name it switches to that config first, then probes it.
- [ ] A successful probe records the handshake, the listing result, the observed exit address and the time, and sets the row to `ok`.
- [ ] A failed probe records the classified reason, sets the row to `failed`, and never surfaces yt-dlp's raw stderr as the row's reason.
- [ ] A config that cannot be read or parsed is refused before any interface command runs, and the active row is unchanged.
- [ ] The row draws the observed exit address and the probe time after a probe.
- [ ] The probe control has an in-flight state, cannot be pressed twice, and reports a failure without claiming the probe succeeded.
- [ ] Only an admin can probe; a non-admin gets not-found; the mutation carries the client header and passes the origin checks.

Verification: `pnpm run build`, `pnpm run lint`, the server, web and YouTube
suites, and a recorded probe against the dry-run agent.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
