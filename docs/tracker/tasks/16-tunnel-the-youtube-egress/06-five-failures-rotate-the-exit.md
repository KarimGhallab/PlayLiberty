# 06: Five failures rotate the exit, and an exhausted pool blocks the sync

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [04](04-a-sync-lists-through-the-tunnel.md), [05](05-a-track-downloads-through-the-tunnel.md).

## Outcome

The policy now sits around the source calls in `EgressPolicyClient`, composed in
`buildApp` only for `YOUTUBE_TRANSPORT=egress-agent`. A listing or a download that
fails with an exit-level reason is counted on the active config, five in a row
switch to the next non-failed config in round robin, and the operation retries
once on the new config. A success writes `ok`, clears the counter and stamps the
attempt; becoming active clears the counter and starts the cooldown.

The classifier is `classifyEgressFailure` plus `isExitLevelFailure`: a bot check,
403, 429, timeout, DNS failure, refused connection or handshake failure counts; a
gone video, a 404, a SponsorBlock outage and a malformed URL never do. A 404 is
now a gone video. The circuit is derived from the rows, never stored: every
config failed means the sync ends `blocked` with the fixed sentence
`The source is unreachable from every exit.` and the tracks stay pending. A
download does not ask a failed pool again; a listing still tries, so the next
sync can notice an exit that came back.

The switch lives in the agent. `POST /switch` drains the registered yt-dlp
children for the server's `EGRESS_DRAIN_TIMEOUT_MS`, kills the process groups
that outlive the drain, then runs `wg-quick strip` and `wg syncconf` inside the
namespace. A route that fails while the switch is in flight answers `switching`,
which the server maps to an interrupted download: the claim returns to `pending`.
The agent refuses a switch with no interface before draining, so a development
host never kills work it cannot replace.

The probe of the loaded config no longer switches, which keeps the page usable
before a host has an interface. A probe that does switch clears the new active
config's counter and starts its cooldown.

Verification: `pnpm run build`, `pnpm run lint:check` and
`npx dependency-cruiser .` (345 modules) pass. Suites: youtube 39, egress-agent
44, server 422, web 594. The recorded fake is
`remoteListing.test.ts`'s `rotates five times and blocks the playlist with the
pending tracks intact`: one real listing creates two pending tracks, the fake
agent then refuses every read, the policy rotates `01-fr` to `02-ch` to `03-us`,
the pool exhausts, the run carries the fixed sentence, the playlist is
`blocked`, and both tracks are still `pending`.

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

- [x] The classifier counts handshake failure, connection timeout, DNS failure, 403, 429 and a bot check.
- [x] It never counts a gone video, a 404, a SponsorBlock outage or a malformed URL.
- [x] The counter persists per config, resets on any success and whenever a config becomes active, and a cooldown stops a burst of parallel failures from walking the pool.
- [x] One operation switches at most once and retries once on the new config.
- [x] A switch drains for at most sixty seconds, then kills; killed tracks return to `pending`.
- [x] When every config is failed, a sync is refused with `blocked`, the gallery says the source is unreachable, no row is marked failed by an upstream block, and the run carries a fixed sentence rather than the vendor's output.
- [x] A successful real listing or download refreshes that config's status and last attempt.
- [x] `blocked` is in both catalogues, and the sync state is exhaustive so a new state cannot be added silently.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
