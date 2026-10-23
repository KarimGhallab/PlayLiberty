# 01: Split the adapter into a fetcher and a composition

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

`packages/youtube` now has two pieces. `YtdlpFetcher` implements the new
`ISourceFetcher` and owns source access only: `listSource` returns the parsed
membership, `fetchTrack` runs the tool and returns the path it wrote.
`YtdlpClient` is the composition: it delegates `listSource`, builds
`downloadTrack` from `fetchTrack` plus `finalizeAudio`, and keeps the thumbnail
fetch. `finalizeAudio` lives in its own module with the faststart arguments, the
probe arguments and the duration read, so bytes from any source can produce a
stored file without a fetcher. `runProcess` moved to its own module because both
sides spawn a child.

The one behaviour change is the latent failure the ticket named. `fetchTrack`
reports the file the tool actually wrote: it scans the temp directory for
`<videoId>.*`, ignores `.part` and `.ytdl`, and takes the newest when a leftover
sits beside it. The hardcoded `<videoId>.m4a` is gone, so the Opus fallback
completes instead of failing on a missing file.

The composition takes an optional fetcher in its constructor. No server module
changed: `buildApp` still constructs `YtdlpClient` with the same options, so
ticket 05 only injects the remote fetcher at that one site.

The list and download argument tests are unchanged. The faststart and probe
argument tests moved to `audio/audioArgs.test.ts` with their assertions intact,
because their builders moved with the code. `fetchedTrack.test.ts` covers the new
path: the resolved extension, the newest file winning over a stale one, and a
partial-only run failing.

Verification: `pnpm run build`, `pnpm run lint:check` and
`npx dependency-cruiser .` pass; the unit suites are green (youtube 34, server
395, web 584). A real download of `jNQXAC9IVRw` through `YtdlpClient` stored
309156 bytes at 19 seconds, remuxed and probed, with the temp directory left
empty, and a real `listSource` on the same URL parsed the title and the one
entry.

## What to build

Make the change easy before the change. `packages/youtube` currently does two
jobs in one call: reach the source, and produce the stored file. Split them.

A fetcher owns source access only: `listSource` returns the parsed membership,
and `fetch` returns the bytes the tool actually wrote for one video. A
composition owns the stored file: fetch, faststart remux, duration probe, and
the result shape `downloadTrack` returns today. The download worker keeps making
that one call, so no feature module learns that a fetcher exists.

This is a prefactor. The only behaviour that changes is a latent failure: the
current download path hardcodes `<videoId>.m4a` after a format selection that can
fall back to Opus, so an Opus-only video fails today. The fetch result reports
the path the tool wrote, and the composition uses it.

## Acceptance criteria

- [x] `downloadTrack` keeps its request and result shapes, so the worker and its tests are untouched.
- [x] The local fetcher emits the same yt-dlp arguments as today: `--ignore-config`, the pinned extractors, `--js-runtimes node`, the SponsorBlock categories, and the sleep, rate, retry and timeout set.
- [x] The existing argument tests still describe the local fetcher and pass unchanged.
- [x] The faststart remux and the duration probe are reachable without a fetcher, so bytes from any source can produce a stored file.
- [x] The fetch result carries the path the tool wrote; an Opus-only video now completes instead of failing on a missing `.m4a`.
- [x] The thumbnail fetch is untouched and still runs in the server.
- [x] A sync and a download still work end to end against the local binary.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
