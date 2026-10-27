# 05: A track downloads through the tunnel

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

Both source calls cross the socket. `EgressAgentFetcher` replaces
`EgressListFetcher`, and `YOUTUBE_TRANSPORT` (renamed from
`YOUTUBE_LIST_TRANSPORT`) selects `local` or `egress-agent` for the whole
adapter.

The agent answers `POST /fetch` with the file itself. It writes into a temp
directory it owns, sets `content-length` and `x-source-extension`, and removes
the directory once the bytes have left, success or failure. The server's client
writes the stream into the existing media temp directory as `<videoId>.<ext>`,
and the unchanged composition remuxes, probes and renames. The agent never sees
the media root.

The server owns the download options: `EgressAgentFetcher` sends the config's
`download` and `DOWNLOAD_TIMEOUT_MS` per request, and the agent validates them
before constructing a fetcher.

A transport that dies mid-stream is `EgressStreamError`. The client removes its
partial file, the agent removes its directory, and the worker releases the claim
back to `pending` through `releaseTrack`, so an interrupted fetch is not a failed
row.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
