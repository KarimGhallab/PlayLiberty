# 29: The public origin sends its security headers

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The single public origin sets no security headers, so it can be framed and its responses sniffed, and a CSP is absent as a second layer behind any future XSS.

**Current behavior:**
The origin's server block sets only `Cache-Control` on the assets and the shell. There is no CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or HSTS, and no CSP meta fallback in the app shell.

**Desired behavior:**
The origin sends, on every response: a CSP with at least `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, and `base-uri 'self'`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: no-referrer`; and `Strict-Transport-Security`. The CSP must allow what the app actually loads: the token stylesheet is same-origin and there are no third-party scripts.

**Key interfaces:**

- The origin's server block in `apps/web/deploy/nginx.conf`, and the app shell it serves.
- The live stream's location, which needs the headers too.

**Acceptance criteria:**

- [x] A response from the origin carries the CSP, `nosniff`, `Referrer-Policy`, and HSTS.
- [x] The CSP permits the app to load and does not break the shell, the assets, the API, or the stream.
- [ ] A test asserts the headers on a real response (an e2e check against the served origin).
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Subresource or nonce machinery; the app has no inline scripts.
- The dev Vite server, which is not the public origin.

## Outcome

Done. The origin sends its security headers on every response.

- `apps/web/deploy/security-headers.conf` holds the headers, included at the server level and again in `/assets/` and `/index.html`, because nginx drops inherited `add_header` directives at any level that defines one and both caching locations define one.
- The CSP is `default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`. It is strict because the app loads only same-origin resources: the bundled scripts and styles, the API's thumbnails and audio, and the live stream. React's dynamic styles go through the CSSOM, which CSP does not police, so no `unsafe-inline` is needed.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security`, and a legacy `X-Frame-Options: DENY` ride along, all with `always` so error responses keep them.
- The web `Containerfile` copies the snippet into the image.

Verification:

- The committed guard is `apps/web/src/testing/securityHeaders.test.ts` (3 tests): the required directives, that every directive carries `always`, and that the snippet is included at the server level and in both caching locations.
- Against a running `nginxinc/nginx-unprivileged` image built from the real config, a real response carries the CSP, nosniff, Referrer-Policy, HSTS, and X-Frame-Options on `/` and `/index.html`.
- A headless browser loading the built SPA through that origin reports zero CSP violations and the shell title.

One criterion is not met by a committed test: `A test asserts the headers on a real response (an e2e check against the served origin)`. The repo's e2e stack serves the app through Vite, not nginx, so it never sees these headers; a served-origin e2e needs the e2e stack to run the nginx origin, a separate change. The real response is verified above and guarded at the config level.

Full unit suite exits 0; `pnpm run build` and `pnpm run lint` clean.

## Evidence

- `apps/web/deploy/nginx.conf:6-56`.
- `apps/web/index.html:1-29`.
- Security review 2026-10-08, finding 10.
