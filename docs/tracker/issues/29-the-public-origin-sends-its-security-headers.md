# 29: The public origin sends its security headers

**State:** `ready-for-agent`
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

- [ ] A response from the origin carries the CSP, `nosniff`, `Referrer-Policy`, and HSTS.
- [ ] The CSP permits the app to load and does not break the shell, the assets, the API, or the stream.
- [ ] A test asserts the headers on a real response (an e2e check against the served origin).
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Subresource or nonce machinery; the app has no inline scripts.
- The dev Vite server, which is not the public origin.

## Evidence

- `apps/web/deploy/nginx.conf:6-56`.
- `apps/web/index.html:1-29`.
- Security review 2026-10-08, finding 10.
