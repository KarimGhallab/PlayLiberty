# Require a client header and origin checks on mutating requests

Every mutating request (`POST`, `PUT`, `PATCH`, `DELETE`) must carry the `X-PlayLiberty-Client` header, and the server rejects any request without it. State is never mutated by `GET`. On top of the required header, the server checks `Origin` and `Sec-Fetch-Site` and denies cross-site non-safe requests. nginx forwards the header and the Pangolin `Remote-*` headers upstream unchanged.

The browser authenticates with Pangolin's session cookie, so without a per-request proof of intent a malicious third-party page could cause an authenticated state change. A non-safelisted custom header cannot be set by a cross-site form, and a cross-origin script that tries to set it triggers a CORS preflight we never approve, so the header is the primary control. `Origin` and `Sec-Fetch-Site` catch requests that predate or bypass the header, and `SameSite` on the edge cookie is defense in depth rather than the main defense. Because the app is same-origin, the header does not itself trigger a preflight, and the whole scheme needs no token storage or per-request token rotation. XSS defeats any CSRF defense, which is why the controls are layered rather than singular.

Alternatives rejected:

- `SameSite` alone: no protection when the edge cookie is `SameSite=None` across domains, and `Lax` still sends the cookie on safe-method top-level navigations.
- A signed double-submit CSRF token: stronger, but more machinery than a same-origin app with a header-only control needs.
- `Origin` or `Referer` alone: absent in some privacy contexts and strippable by intermediaries.
