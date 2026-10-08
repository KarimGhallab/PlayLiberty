# 30: The image trusts a committed digest, not the download channel

**State:** `ready-for-agent`
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

- [ ] The yt-dlp digest is committed in the repo and the build fails if the downloaded binary does not match it.
- [ ] A mismatch fails the build rather than warning.
- [ ] ffmpeg and ffprobe are pinned to a version or digest.
- [ ] The image builds with the pinned values.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Signing infrastructure beyond a committed digest.
- The other services' images, which pull no executable from a release.

## Evidence

- `apps/server/Containerfile:45, 47, 49-53`.
- Security review 2026-10-08, finding 13.
