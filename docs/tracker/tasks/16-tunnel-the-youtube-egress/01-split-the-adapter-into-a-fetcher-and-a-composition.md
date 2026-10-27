# 01: Split the adapter into a fetcher and a composition

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`packages/youtube` now has a fetcher and a composition. `YtdlpFetcher`
implements `ISourceFetcher` and owns source access only: `listSource` returns the
parsed membership, `fetchTrack` runs the tool and returns the path it wrote.
`YtdlpClient` is the composition: it delegates `listSource`, builds
`downloadTrack` from `fetchTrack` plus `finalizeAudio`, and keeps the thumbnail
fetch. `finalizeAudio` lives in its own module with the faststart arguments, the
probe arguments and the duration read, so bytes from any source can produce a
stored file without a fetcher. `runProcess` moved to its own module because both
sides spawn a child.

The one behaviour change is the latent Opus failure. `fetchTrack` scans the temp
directory for `<videoId>.*`, ignores `.part` and `.ytdl`, and takes the newest
when a leftover sits beside it, so the hardcoded `<videoId>.m4a` no longer fails
the fallback.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
