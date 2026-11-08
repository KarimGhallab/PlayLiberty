# Provision mobile access through browser SSO

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The flow in [`20-provision-mobile-access`](../specs/20-provision-mobile-access.md) is implemented across the
server, the edge record, the proxies and the app.

- **Server.** `GET /provision` sits behind SSO, validates the PKCE challenge, the redirect URI and the state,
  mints a single-use 60-second code bound to `Remote-User`, the redirect URI and the challenge, and redirects.
  `POST /auth/exchange` is assertion-only: it consumes the code atomically, compares the S256 verifier in constant
  time, enforces the exact redirect, rate limits ten attempts a minute, and mints a 180-day per-user token through
  `POST /public-resource/{id}/access-token`. The token pair is the only thing it answers.
- **Config.** `PANGOLIN_API_URL`, `PANGOLIN_RESOURCE_ID` and `PANGOLIN_INTEGRATION_API_KEY` are set together or not
  at all; a partial set fails the boot, and none leaves the exchange answering `503 provisioning_unavailable`
  without touching the rest of the instance. `MOBILE_REDIRECT_URIS` is the exact callback allowlist.
- **Layering.** The token-issuer and code-store contracts live in `shared/`, so `shared/context.ts` does not import
  a feature; the features implement them and `buildApp` constructs them.
- **Edge.** `deploy/pangolin/README.md` records the one Bypass Auth path rule, `auth/exchange`, above every other
  rule, plus enabling the Integration API and minting the key. Everything else stays behind Platform SSO.
- **Proxies.** nginx forwards `/provision` and `/auth/exchange`; the Vite dev proxy forwards the same paths and
  injects the edge assertion and the dev identity. Vite now reads `.env.local`, so `DEV_REMOTE_USER` and the rest
  live there. The user id must be a real Pangolin user, because the token is bound to it.
- **Mobile.** `expo-crypto` builds the verifier and the state, `WebBrowser.openAuthSessionAsync` opens the flow, and
  the token pair is stored with `expo-secure-store`. The flow is split: `beginProvisioning` opens the browser and
  keeps the verifier in a pending store, and the callback route calls `completeProvisioning`. The callback is a real
  route, `app/provision.tsx` for the scheme and `app/auth/callback.tsx` for the HTTPS App Link, both rendering one
  shared `ProvisionCallback`; without it the deep link landed on the not-found page. The session re-reads the token
  whenever the library regains focus, so the callback's write is seen on the way back.

**Constraints:** The dev proxy injects a fixed identity and binds to loopback; it must never be exposed on a LAN.
