# 03: Write the duration the file reports

**Blocked by:** [`02`](02-store-a-track-with-non-music-parts-skipped.md).
**Status:** resolved

## Outcome

Implemented and verified. `DownloadTrackResult` gains `durationSeconds`, and `downloadTrack` probes the finished
file after the faststart remux, for every download. The probe is ffprobe, run through a new
`buildProbeArgs`/`probeDuration` pair: `-show_entries format=duration` with
`-of default=noprint_wrappers=1:nokey=1`, so the duration comes back as a bare number rather than parsed out of
ffmpeg's human-readable banner. A probe that returns no number throws, which fails the download rather than
storing a track with a duration nobody can trust.

`FFPROBE_BINARY` is a new config value defaulting to `ffprobe`, plumbed through `Config`, `YtdlpOptions` and
`buildApp`, and documented in `.env.example` beside the other two binaries. The worker writes
`durationSeconds: result.durationSeconds` in the success update, so the file's length replaces the source
metadata the row was created with; the failure branch does not touch the field.

The fakes return a duration so the feature tests can assert the write: the E2E fake reports the committed
fixture's two seconds, and the worker's fake reports two against a seeded source of 180.

The tests: the probe arguments' shape, the worker writing the adapter's duration over the source's, the failure
case leaving the source value alone, and the E2E fake reporting its file's length. The worker fake returns a
constant, so the probe's own process is not exercised by a unit test; it is the adapter's seam and there is no
harness below it.

Verification: `pnpm run test` (server 231, web 262, youtube 18, e2e 21), `pnpm run build`, `pnpm run lint` pass. No em dashes. Not committed.
