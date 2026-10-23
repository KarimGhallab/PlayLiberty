# 04: A sync lists through the tunnel

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [01](01-split-the-adapter-into-a-fetcher-and-a-composition.md), [02](02-the-egress-page-shows-the-pool-and-its-state.md).

## Outcome

A playlist's listing can now come from the egress agent while the bytes stay
local.

`YOUTUBE_LIST_TRANSPORT` selects the transport: `local` (the default) or
`egress-agent`. `buildApp` composes `EgressListFetcher` around the agent's
listing and the local `YtdlpFetcher`'s bytes, so `YtdlpClient` and the download
worker are untouched. A workstation, the tests and the default deployment still
read locally.

The agent answers `POST /list` with `{ url }`. A URL `validateYoutubeUrl` refuses
is `400 invalid_source`; a listing failure is `502` with the classified reason.
The client maps those to `EgressSourceInvalidError` and
`EgressSourceUnavailableError`, whose messages are fixed sentences
(`YouTube refused the request from the exit.`, `The source is not available.`,
`The exit could not be reached.`, `The source could not be read.`). The sync run
records that sentence, so a refused source is not mistaken for a transport
fault; a socket or timeout failure keeps its own message. The source payload is
validated before it reaches reconciliation.

The probe and the listing share one invocation path: both call
`YtdlpFetcher.listSource`, so the arguments cannot drift.

Verification: `pnpm run build`, `pnpm run lint:check` and
`npx dependency-cruiser .` (337 modules) pass. Suites: youtube 34, egress-agent
23, server 408, web 593. The new `remoteListing.test.ts` records a playlist whose
two tracks came from the agent (`calls` is exactly the pasted URL, the run is
completed with `addedCount: 2`), a blocked source whose run error is
`YouTube refused the request from the exit.`, and a transport fault whose run
error keeps its own sentence.

## What to build

Wire the remote fetcher's listing into the sync, so pasting a playlist reads its
membership through the Proton exit instead of the VPS address. A configuration
value selects the transport; the local fetcher stays the default, so development
and tests are unaffected and the binary on a workstation still works.

Downloads are still direct after this ticket. That is deliberate: the listing is
the call that gets a bot check, and proving it works through the exit is the
milestone, before any byte streaming exists.

## Acceptance criteria

- [x] With the remote transport configured, a new playlist's listing comes from the agent, and the run's recorded source is the exit.
- [x] With the local transport, nothing changes from today.
- [x] Reconciliation, retention, counts and events are identical on both transports.
- [x] A gone, private or malformed source still fails the run with a readable sentence, and is not reported as a transport fault.
- [x] A transport failure is reported as such, distinct from a sync bug, and the run records it.
- [x] Thumbnails still leave from the server.
- [x] The probe and the listing share one invocation path, so their arguments cannot drift.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
