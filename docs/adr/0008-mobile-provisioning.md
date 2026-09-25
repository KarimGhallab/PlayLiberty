# Provision mobile access with browser SSO and a one-time code

The mobile client authenticates with a per-user Pangolin resource access token, obtained through a self-service browser flow. The app generates `state` and a PKCE verifier with `expo-crypto`, and opens the origin's `GET /provision` in an in-app browser (`WebBrowser.openAuthSessionAsync`). Pangolin SSO authenticates the browser, so the server sees `Remote-User` and mints a single-use code with a 60-second lifetime, bound to that user, the exact redirect URI, and the PKCE challenge, then redirects to the app. The app posts the code and verifier to `POST /auth/exchange`, which is exempt from Pangolin SSO and owns the PKCE check, atomic single use, exact redirect matching, and rate limiting, and which mints a 180-day Pangolin access token through the Integration API. The app stores the token in `expo-secure-store` and sends it as `P-Access-Token-Id` plus `P-Access-Token`; Badger strips those and injects `Remote-*`, so the origin is unchanged and ADR 0003 holds.

The phone cannot present an upstream IdP token to Pangolin, because Pangolin is only a relying party, and it holds no Pangolin session, so a browser-mediated provisioning flow with a code exchange is the only self-service path that keeps per-user identity and leaves the origin untouched. The long-lived token never travels in a URL: the redirect carries a single-use code bound by PKCE to the app instance. On iOS, `ASWebAuthenticationSession` guarantees the callback reaches only the calling app. On Android in Expo SDK 57 there is no equivalent guarantee, so the safety rests on the code plus PKCE rather than on the URL scheme; the flow tries a verified HTTPS App Link first and falls back to a reverse-DNS custom scheme. A 180-day lifetime bounds a bearer that has no device binding, and re-provisioning is a browser round trip.

Every other request stays behind Pangolin SSO. The one edge exception is an exact-path bypass for `POST /auth/exchange`, which is the app's first contact and is protected by the code, PKCE, lifetime, and rate limiting, exactly as an OAuth token endpoint is.

Alternatives rejected:

- An admin-generated QR pasted by hand from the web app: no self-service, and a phone could not re-provision itself.
- Pangolin device web auth plus resource-session cookie reuse: self-service and session-bounded, but it depends on internal endpoints and dynamic cookie names.
- A shared header or basic-auth secret: it carries no user identity.
- App-issued device tokens: a second identity path in the server, contradicting ADR 0003.
- Presenting an upstream IdP token to Pangolin: Pangolin neither validates nor forwards it.
- The token directly in the redirect URL: it would leak through history, logs, and referrers, and a hijacked value would be immediately usable.
