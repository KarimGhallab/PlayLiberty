# 25: The thumbnail fetch cannot be pointed off the image hosts

**State:** `resolved`
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

- [x] A thumbnail URL whose host is not an allowed image host is rejected.
- [x] A redirect to a non-allowlisted host is rejected rather than followed.
- [x] A response larger than the cap is refused, and a slow response times out.
- [x] A valid YouTube thumbnail still stores.
- [x] Tests cover the rejected host, the redirect, and the size or timeout bound.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Validating the entry id, which is issue 26; the two share the adapter boundary but not the code path.
- The manual-add path, which does not fetch a thumbnail directly.

## Outcome

Done. The thumbnail fetch is pinned and bounded.

- `fetchThumbnail` resolves the URL against an allowlist of YouTube image hosts (`ytimg.com` and its subdomains, `img.youtube.com`) over https before fetching.
- The fetch uses `redirect: 'manual'`; a redirect is resolved against the current URL and re-checked, so one that leaves the allowlist is refused, and only a bounded number of hops is followed.
- The request carries an `AbortSignal.timeout`, and the body is read through a byte cap rather than buffered whole, so a slow or oversized response is refused.
- The timeout and cap default to 15 s and 5 MiB, overridable through `YtdlpOptions` so a test can pin them small.
- The download worker's best-effort rule is unchanged: a refused thumbnail leaves the track stored with a null thumbnail.

Verification: seven new tests (allowed host stored, non-allowlisted host, non-https, off-allowlist redirect refused, on-allowlist redirect followed, oversized body, slow response). The youtube suite is 29 tests; the full unit suite exits 0 (tokens 3, youtube 29, i18n 39, ui-foundation 6, server 282, web 372); `pnpm run build` and `pnpm run lint` clean.

## Evidence

- `packages/youtube/src/ytdlp/ytdlp.ts:373-384`.
- `packages/youtube/src/ytdlp/ytdlp.ts:164-174, 189`.
- `apps/server/src/features/downloads/worker/downloadWorker.ts:259-278`.
- Security review 2026-10-08, finding 4.
