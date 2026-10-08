# 30: The image trusts a committed digest, not the download channel

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** The build verifies the yt-dlp binary against a checksum downloaded from the same release, and installs ffmpeg unpinned, so a compromised release or mirror can ship a backdoored tool the server then executes.

**Current behavior:**
The server `Containerfile` downloads `yt-dlp_linux` and `SHA2-256SUMS` from the same GitHub release and checks one against the other. `ffmpeg` and `ffprobe` come from apt with no version pin. The server runs yt-dlp on every download, so the binary is code execution inside the container with the database and media mounted.

**Desired behavior:**
The expected yt-dlp digest is committed in the repository and checked against the downloaded binary, so verification does not trust the same channel that served the artifact. The digest is updated deliberately when `YTDLP_VERSION` changes. ffmpeg and ffprobe are pinned to a version or a digest.

**Key interfaces:**

- The server `Containerfile`, the `YTDLP_VERSION` argument, and a committed digest file or argument.
- The deployment build, which uses the same Containerfile.

**Acceptance criteria:**

- [x] The yt-dlp digest is committed in the repo and the build fails if the downloaded binary does not match it.
- [x] A mismatch fails the build rather than warning.
- [x] ffmpeg and ffprobe are pinned to a version or digest.
- [x] The image builds with the pinned values.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Signing infrastructure beyond a committed digest.
- The other services' images, which pull no executable from a release.

## Outcome

Done. The image trusts a committed digest, not the release it downloads from.

- `YTDLP_SHA256` is committed beside `YTDLP_VERSION` in the server `Containerfile`, and the build checks the downloaded `yt-dlp_linux` against it with `sha256sum -c`. The release's own `SHA2-256SUMS` is no longer downloaded, so verification does not trust the channel that served the binary.
- A wrong digest fails the build: `sha256sum -c` exits non-zero and the `&&` chain stops the step.
- `ffmpeg` (which ships `ffprobe`) is pinned to `7:5.1.9-0+deb12u1`, so the audio toolchain does not drift under a rebuild.

Verification: built the server image; the step printed `yt-dlp_linux: OK`, and the image reports `yt-dlp 2026.08.19`, `ffmpeg 5.1.9-0+deb12u1`, and `ffprobe 5.1.9-0+deb12u1`. A build with a wrong `YTDLP_SHA256` failed at the check with `FAILED` and `did NOT match`. Full unit suite exits 0; `pnpm run build` and `pnpm run lint` clean.

The digest and the version are a pair: bumping `YTDLP_VERSION` means taking the new value from that release's `SHA2-256SUMS` and committing it as `YTDLP_SHA256` in the same change.

## Evidence

- `apps/server/Containerfile:45, 47, 49-53`.
- Security review 2026-10-08, finding 13.
