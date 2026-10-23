# 03: An admin can probe an exit

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [02](02-the-egress-page-shows-the-pool-and-its-state.md).

## Outcome

The pool page is now evidence. Each row has a Probe control; the agent measures
the exit and the server stores the result.

The agent answers `POST /probe` with `{ name? }`. A named probe first switches to
that config through the same `requireInPool` check a manual switch will use, then
measures. A config with no endpoint, or a name not in the pool, is refused with
`400 unknown_config` before anything else runs; the server turns that into
`404 not_found`.

The three facts: the latest handshake (`wg show <iface> latest-handshakes`, only
when `WG_INTERFACE` is set), one listing extraction on `PROBE_URL`, and the exit's
own address from `EXIT_IP_URL`. The listing and the address decide the verdict;
the handshake is evidence, because a tunnel that has just carried traffic is up
even when its last handshake looks old. A null handshake means no interface is
configured, which is the workstation case, not a failure.

A failure is classified into `blocked`, `unavailable`, `network` or `unknown` by
`classifyEgressFailure`, and that code is what the row stores. The page maps the
code to a catalog sentence; yt-dlp's stderr never reaches the row.

The server's `probeEgress` writes `status`, `lastProbeAt`, `lastExitIp`,
`lastError`, resets the consecutive-failure counter on success, and moves the
active marker to whatever the agent reports after the switch. An unreachable
agent is still an answer: the route returns `200` with `agentReachable: false`
and the rows unchanged, and the page shows a notice. An HTTP failure shows the
"probe could not be run" notice.

The handshake is measured and reported but not stored, because the spec's
`egress_config` has no column for it. The stored facts are the verdict, the
reason, the exit address and the probe time. If the handshake is wanted as a
column, it is one migration away.

Verification: `pnpm run build`, `pnpm run lint:check` and
`npx dependency-cruiser .` (335 modules) pass. Suites: egress-agent 20, server
405, web 593. A recorded probe against the real agent on the fixture pool:
`status` reports `01-fr` active, then `probe('02-ch')` returns
`{ handshake: null, listing: true, exitIp: "146.70.194.86", reason: null,
active: "02-ch" }` and the active marker moves. That address is the workstation's
own, because no tunnel is configured here; on the host it is the Proton exit.

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

- [x] `probe` with no name probes the loaded config; with a name it switches to that config first, then probes it.
- [x] A successful probe records the handshake, the listing result, the observed exit address and the time, and sets the row to `ok`.
- [x] A failed probe records the classified reason, sets the row to `failed`, and never surfaces yt-dlp's raw stderr as the row's reason.
- [x] A config that cannot be read or parsed is refused before any interface command runs, and the active row is unchanged.
- [x] The row draws the observed exit address and the probe time after a probe.
- [x] The probe control has an in-flight state, cannot be pressed twice, and reports a failure without claiming the probe succeeded.
- [x] Only an admin can probe; a non-admin gets not-found; the mutation carries the client header and passes the origin checks.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
