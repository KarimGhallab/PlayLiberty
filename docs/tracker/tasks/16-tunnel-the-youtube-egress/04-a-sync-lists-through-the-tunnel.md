# 04: A sync lists through the tunnel

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

A playlist's listing could come from the agent before any byte did.
`YOUTUBE_LIST_TRANSPORT` selected `local` or `egress-agent`, and the agent
answered `POST /list` with `{ url }`. A URL `validateYoutubeUrl` refused and a
listing failure mapped to `EgressSourceInvalidError` and
`EgressSourceUnavailableError`, whose fixed sentences the run records, so a
refused source is not mistaken for a transport fault.

The probe and the listing shared one invocation path, `YtdlpFetcher.listSource`,
so their arguments could not drift.

[05](05-a-track-downloads-through-the-tunnel.md) replaced the listing-only
fetcher with a transport for the whole adapter.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
