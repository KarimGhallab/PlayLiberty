# 29: The public origin sends its security headers

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

The origin sends its security headers on every response. `apps/web/deploy/security-headers.conf` holds the headers, included at the server level and again in `/assets/` and `/index.html`, because nginx drops inherited `add_header` directives at any level that defines one and both caching locations define one. The CSP is `default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`, strict because the app loads only same-origin resources; React's dynamic styles go through the CSSOM, which CSP does not police, so no `unsafe-inline` is needed. `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security`, and a legacy `X-Frame-Options: DENY` ride along, all with `always` so error responses keep them, and the web `Containerfile` copies the snippet into the image. The committed guard is `apps/web/src/testing/securityHeaders.test.ts` (3 tests); a served-origin e2e check needs the e2e stack to run the nginx origin, a separate change, because it serves the app through Vite.
