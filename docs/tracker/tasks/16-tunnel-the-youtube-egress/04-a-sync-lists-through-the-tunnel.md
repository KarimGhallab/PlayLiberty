# 04: A sync lists through the tunnel

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [01](01-split-the-adapter-into-a-fetcher-and-a-composition.md), [02](02-the-egress-page-shows-the-pool-and-its-state.md).

## What to build

Wire the remote fetcher's listing into the sync, so pasting a playlist reads its
membership through the Proton exit instead of the VPS address. A configuration
value selects the transport; the local fetcher stays the default, so development
and tests are unaffected and the binary on a workstation still works.

Downloads are still direct after this ticket. That is deliberate: the listing is
the call that gets a bot check, and proving it works through the exit is the
milestone, before any byte streaming exists.

## Acceptance criteria

- [ ] With the remote transport configured, a new playlist's listing comes from the agent, and the run's recorded source is the exit.
- [ ] With the local transport, nothing changes from today.
- [ ] Reconciliation, retention, counts and events are identical on both transports.
- [ ] A gone, private or malformed source still fails the run with a readable sentence, and is not reported as a transport fault.
- [ ] A transport failure is reported as such, distinct from a sync bug, and the run records it.
- [ ] Thumbnails still leave from the server.
- [ ] The probe and the listing share one invocation path, so their arguments cannot drift.

Verification: `pnpm run build`, `pnpm run lint`, the server and YouTube suites,
and one recorded sync whose listing came from the agent.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
