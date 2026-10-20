# 03: Write the duration the file reports

**Status:** resolved

## Outcome

`DownloadTrackResult` gains `durationSeconds`, and `downloadTrack` probes the finished file with a new `buildProbeArgs`/`probeDuration` pair after the faststart remux, for every download: `-show_entries format=duration` with `-of default=noprint_wrappers=1:nokey=1`, so the duration comes back as a bare number rather than parsed out of ffmpeg's human-readable banner. A probe that returns no number throws, failing the download rather than storing a track with a duration nobody can trust. `FFPROBE_BINARY` is a new config value defaulting to `ffprobe`, plumbed through `Config`, `YtdlpOptions` and `buildApp`, and documented in `.env.example` beside the other two binaries. The worker writes `durationSeconds: result.durationSeconds` in the success update, so the file's length replaces the source metadata the row was created with, and the failure branch does not touch the field.

See [`10-skip-non-music-parts`](../../specs/10-skip-non-music-parts.md).
