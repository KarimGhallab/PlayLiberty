# 30: The image trusts a committed digest, not the download channel

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Outcome

The image trusts a committed digest, not the release it downloads from. `YTDLP_SHA256` is committed beside `YTDLP_VERSION` in the server `Containerfile`, and the build checks the downloaded `yt-dlp_linux` against it with `sha256sum -c`; the release's own `SHA2-256SUMS` is no longer downloaded, so verification does not trust the channel that served the binary, and a wrong digest fails the build with a non-zero exit that stops the chain. `ffmpeg` (which ships `ffprobe`) is pinned to `7:5.1.9-0+deb12u1`, so the audio toolchain does not drift under a rebuild. The digest and the version are a pair: bumping `YTDLP_VERSION` means taking the new value from that release's `SHA2-256SUMS` and committing it as `YTDLP_SHA256` in the same change.
