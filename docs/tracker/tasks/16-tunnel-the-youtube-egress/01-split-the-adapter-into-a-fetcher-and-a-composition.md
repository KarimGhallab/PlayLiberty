# 01: Split the adapter into a fetcher and a composition

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

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

- [ ] `downloadTrack` keeps its request and result shapes, so the worker and its tests are untouched.
- [ ] The local fetcher emits the same yt-dlp arguments as today: `--ignore-config`, the pinned extractors, `--js-runtimes node`, the SponsorBlock categories, and the sleep, rate, retry and timeout set.
- [ ] The existing argument tests still describe the local fetcher and pass unchanged.
- [ ] The faststart remux and the duration probe are reachable without a fetcher, so bytes from any source can produce a stored file.
- [ ] The fetch result carries the path the tool wrote; an Opus-only video now completes instead of failing on a missing `.m4a`.
- [ ] The thumbnail fetch is untouched and still runs in the server.
- [ ] A sync and a download still work end to end against the local binary.

Verification: `pnpm run build`, `pnpm run lint`, the YouTube and server suites,
and one real local sync that stores a track.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
