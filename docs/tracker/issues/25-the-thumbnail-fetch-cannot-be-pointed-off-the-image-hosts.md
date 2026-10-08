# 25: The thumbnail fetch cannot be pointed off the image hosts

**State:** `ready-for-agent`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** `fetchThumbnail` fetches a URL taken from yt-dlp's metadata with no host allowlist, follows redirects anywhere, and has no timeout or size cap, so a URL that is ever attacker-influenced becomes blind SSRF and an unbounded read.

**Current behavior:**
`YtdlpClient.fetchThumbnail` calls `fetch(url)`, where `url` is `thumbnails[].url` from yt-dlp JSON, copied verbatim. Node's `fetch` follows redirects by default. The body is buffered whole and written to the thumbnail store, then served back through the thumbnail route. Today the only source is YouTube's extractor, so the destination is fixed by the source, not by the app.

**Desired behavior:**
The thumbnail fetch is pinned to the YouTube image hosts over https. A redirect that leaves the allowlist is refused. The request has a timeout and a maximum body size, so one fetch cannot pin a worker or fill the disk.

**Key interfaces:**

- `firstThumbnailUrl` and `fetchThumbnail` in `packages/youtube`.
- The download worker, which calls the fetch with the stored `thumbnailUrl`.
- A URL that fails the policy leaves the track stored with a null thumbnail, which is already the best-effort rule.

**Acceptance criteria:**

- [ ] A thumbnail URL whose host is not an allowed image host is rejected.
- [ ] A redirect to a non-allowlisted host is rejected rather than followed.
- [ ] A response larger than the cap is refused, and a slow response times out.
- [ ] A valid YouTube thumbnail still stores.
- [ ] Tests cover the rejected host, the redirect, and the size or timeout bound.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Validating the entry id, which is issue 26; the two share the adapter boundary but not the code path.
- The manual-add path, which does not fetch a thumbnail directly.

## Evidence

- `packages/youtube/src/ytdlp/ytdlp.ts:373-384`.
- `packages/youtube/src/ytdlp/ytdlp.ts:164-174, 189`.
- `apps/server/src/features/downloads/worker/downloadWorker.ts:259-278`.
- Security review 2026-10-08, finding 4.
