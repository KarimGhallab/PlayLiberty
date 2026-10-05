# 04: Treat a SponsorBlock failure as retryable, not a gone video

**What to build:** A SponsorBlock lookup that fails is a transient failure, not a deleted video. The adapter
classifies yt-dlp's own SponsorBlock phrases into a typed error, mirroring the unavailable-video classification,
and the worker records `failed` with a stable, readable reason and never `unavailable`. The existing sync retry
is the whole recovery: the next sync returns the track to `pending`, and no timer and no second process runs
behind the listener.

**Blocked by:** [`02`](02-store-a-track-with-non-music-parts-skipped.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The adapter classifies the SponsorBlock failure phrases into a typed error.
- [ ] The worker records `failed` with the stable reason and never `unavailable`.
- [ ] The next sync returns the track to `pending` and retries it.
- [ ] The reason is a fixed string, not the tool's raw output.

**Verification:** the adapter's classification tests and the server route tests over a temporary database,
`pnpm run build` and `pnpm run lint`.
