# 25: The thumbnail fetch cannot be pointed off the image hosts

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Outcome

The thumbnail fetch is pinned and bounded. `fetchThumbnail` resolves the URL against an allowlist of YouTube image hosts (`ytimg.com` and its subdomains, `img.youtube.com`) over https before fetching, follows at most a bounded number of redirects with `redirect: 'manual'` and re-checks each hop against the allowlist, and carries an `AbortSignal.timeout` with the body read through a byte cap rather than buffered whole. The timeout and cap default to 15 s and 5 MiB, overridable through `YtdlpOptions` so a test can pin them small. A refused thumbnail still leaves the track stored with a null thumbnail.
