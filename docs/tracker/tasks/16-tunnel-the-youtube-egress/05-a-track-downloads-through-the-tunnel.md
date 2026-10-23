# 05: A track downloads through the tunnel

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [04](04-a-sync-lists-through-the-tunnel.md).

## Outcome

Both source calls now cross the socket. `EgressAgentFetcher` replaces
`EgressListFetcher`, and `YOUTUBE_TRANSPORT` (renamed from
`YOUTUBE_LIST_TRANSPORT`) selects `local` or `egress-agent` for the whole
adapter.

The agent answers `POST /fetch` with the file itself. It writes into a temp
directory it owns, sets `content-length` and `x-source-extension`, and removes
the directory once the bytes have left, success or failure. The server's client
writes the stream into the existing media temp directory as
`<videoId>.<ext>`, and the unchanged composition remuxes, probes and renames. The
agent never sees the media root.

The server owns the download options: `EgressAgentFetcher` sends the config's
`download` and `DOWNLOAD_TIMEOUT_MS` per request, and the agent validates them
before constructing a fetcher. There is still one configuration surface.

A transport that dies mid-stream is `EgressStreamError`. The client removes its
partial file, the agent removes its directory, and the worker releases the claim
back to `pending` through a new `releaseTrack`, so an interrupted fetch is not a
failed row. A gone video still maps to `YoutubeVideoUnavailableError`, a
SponsorBlock outage to `YoutubeSponsorBlockError`, and a refused exit to
`EgressSourceUnavailableError`. The worker's call is unchanged; one test was
added for the interrupted branch.

Verification: `pnpm run build`, `pnpm run lint:check` and
`npx dependency-cruiser .` (337 modules) pass. Suites: youtube 34, egress-agent
27, server 409, web 593. A recorded download through the real agent and yt-dlp:
`jNQXAC9IVRw` fetched over the socket, remuxed and probed to 19 seconds and
309156 bytes, with the media temp directory left empty.

## What to build

The streaming fetch. The agent runs yt-dlp inside the namespace and streams the
raw download back with the extension the tool produced; the server writes it into
the media temp directory and the existing remux, probe and atomic rename finish
the job. The worker's call does not change, and the stored-file contract stays
the server's.

## Acceptance criteria

- [x] A pending track becomes stored with bytes fetched through the exit.
- [x] The bytes are written under the media temp directory and the rename into the store stays atomic; the agent never writes the media root.
- [x] The source extension travels with the bytes, so an Opus-only video stores successfully.
- [x] A fetch that dies mid-stream leaves no stored file and returns the track to `pending`.
- [x] The temp file is removed on success and on failure, and an interrupted fetch leaves no partial file in the store.
- [x] Thumbnails, faststart, the duration probe and the no-transcoding rule are unchanged.
- [x] The worker's call and its tests are unchanged from before the transport existed.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
