# 05: A track downloads through the tunnel

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [04](04-a-sync-lists-through-the-tunnel.md).

## What to build

The streaming fetch. The agent runs yt-dlp inside the namespace and streams the
raw download back with the extension the tool produced; the server writes it into
the media temp directory and the existing remux, probe and atomic rename finish
the job. The worker's call does not change, and the stored-file contract stays
the server's.

## Acceptance criteria

- [ ] A pending track becomes stored with bytes fetched through the exit.
- [ ] The bytes are written under the media temp directory and the rename into the store stays atomic; the agent never writes the media root.
- [ ] The source extension travels with the bytes, so an Opus-only video stores successfully.
- [ ] A fetch that dies mid-stream leaves no stored file and returns the track to `pending`.
- [ ] The temp file is removed on success and on failure, and an interrupted fetch leaves no partial file in the store.
- [ ] Thumbnails, faststart, the duration probe and the no-transcoding rule are unchanged.
- [ ] The worker's call and its tests are unchanged from before the transport existed.

Verification: `pnpm run build`, `pnpm run lint`, the server and YouTube suites,
and one recorded track moving from pending to stored through the agent.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
