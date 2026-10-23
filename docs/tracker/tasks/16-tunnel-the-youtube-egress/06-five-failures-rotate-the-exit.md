# 06: Five failures rotate the exit, and an exhausted pool blocks the sync

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [04](04-a-sync-lists-through-the-tunnel.md), [05](05-a-track-downloads-through-the-tunnel.md).

## What to build

The policy. An exit-level failure is classified before it counts, counted per
config, and five in a row switch to the next config in round robin. A success
resets the count. When every config is failed the circuit is open, the sync
answers `blocked`, and the tracks stay pending instead of being blamed.

The switch lives in the agent: it drains in-flight children for up to sixty
seconds, then kills the process group and applies `wg syncconf` inside the
namespace. The server decides when; the agent executes. A track whose download is
killed by a switch returns to `pending`, never to `failed`.

## Acceptance criteria

- [ ] The classifier counts handshake failure, connection timeout, DNS failure, 403, 429 and a bot check.
- [ ] It never counts a gone video, a 404, a SponsorBlock outage or a malformed URL.
- [ ] The counter persists per config, resets on any success and whenever a config becomes active, and a cooldown stops a burst of parallel failures from walking the pool.
- [ ] One operation switches at most once and retries once on the new config.
- [ ] A switch drains for at most sixty seconds, then kills; killed tracks return to `pending`.
- [ ] When every config is failed, a sync is refused with `blocked`, the gallery says the source is unreachable, no row is marked failed by an upstream block, and the run carries a fixed sentence rather than the vendor's output.
- [ ] A successful real listing or download refreshes that config's status and last attempt.
- [ ] `blocked` is in both catalogues, and the sync state is exhaustive so a new state cannot be added silently.

Verification: `pnpm run build`, `pnpm run lint`, the server, web and YouTube
suites, and a recorded fake that fails five times, rotates, then exhausts the
pool and produces `blocked` with the pending rows intact.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
