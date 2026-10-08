# 25: The thumbnail fetch cannot be pointed off the image hosts

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Outcome

Done. The thumbnail fetch is pinned and bounded.

- `fetchThumbnail` resolves the URL against an allowlist of YouTube image hosts (`ytimg.com` and its subdomains, `img.youtube.com`) over https before fetching.
- The fetch uses `redirect: 'manual'`; a redirect is resolved against the current URL and re-checked, so one that leaves the allowlist is refused, and only a bounded number of hops is followed.
- The request carries an `AbortSignal.timeout`, and the body is read through a byte cap rather than buffered whole, so a slow or oversized response is refused.
- The timeout and cap default to 15 s and 5 MiB, overridable through `YtdlpOptions` so a test can pin them small.
- The download worker's best-effort rule is unchanged: a refused thumbnail leaves the track stored with a null thumbnail.

Verification: seven new tests (allowed host stored, non-allowlisted host, non-https, off-allowlist redirect refused, on-allowlist redirect followed, oversized body, slow response). The youtube suite is 29 tests; the full unit suite exits 0 (tokens 3, youtube 29, i18n 39, ui-foundation 6, server 282, web 372); `pnpm run build` and `pnpm run lint` clean.
