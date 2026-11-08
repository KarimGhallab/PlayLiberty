# Provision mobile access

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

The mobile client is the one client that cannot borrow the browser's session. The edge authenticates a browser
once and sets a cookie; a native app holds no cookie jar and reaches the same origin from outside a browser's
navigation, so every request it makes would be refused before it reached the server. The app therefore needs a
credential of its own, and the only party that can issue one is the edge.

Handing a long-lived credential to an app is the part that has to be decided carefully. A password or a shared
secret would be a second authentication system beside Pangolin's. A token pasted by the user would be a support
burden and a phishing surface. A token delivered in a redirect URL would sit in the browser's history, in the
referrer, and in any screenshot. And a callback that any installed app can register on Android would let a
malicious app receive the code.

## Solution

The app obtains a per-user Pangolin resource access token through a browser flow it starts and the edge completes.
The app opens the instance's provisioning route with a PKCE challenge and a state it generated; the edge, already
authenticated by its own session, mints a single-use 60-second code bound to the user, the redirect URI and the
challenge, and redirects back to the app. The app exchanges the code with its verifier for a short access token and
a rotating refresh token, and stores them as one record in the device's secure store. The refresh token never
travels in a URL. The exchange and the refresh are the two paths outside SSO, each exact and method-scoped; the
exchange is protected by the code plus PKCE rather than by the session. The refresh, reuse and revocation rules are
spec `33`'s.

## Implementation Decisions

- **The flow is OAuth's authorization code with PKCE, and nothing new is invented.** The app generates a verifier
  and its S256 challenge, and a random `state`. `GET /provision` carries the challenge, the redirect URI and the
  state; the app verifies the returned state with a constant-time comparison before it exchanges anything.
  _Decided here:_ the edge already trusts a browser session, so the only missing piece is a way to turn that
  session into an app credential, and the standard flow is the one whose failure modes are known.
- **`GET /provision` is behind SSO and answers a redirect to the app.** It validates the challenge, the redirect
  URI and the state, mints a single-use code with a 60-second lifetime bound to `Remote-User`, the exact redirect
  URI and the challenge, and redirects with the code and the state. It creates no account and writes nothing.
  _Decided here:_ a server-rendered confirmation page would be a second screen to design and a second place to
  fail; the edge has already authenticated the person, so one redirect is the whole interaction.
- **`POST /auth/exchange` is the first of the two paths outside SSO.** It takes the code and the verifier, consumes
  the code atomically, compares the verifier against the stored challenge, enforces an exact redirect match, applies
  a rate limit, and mints a short-lived Pangolin resource access token through the Integration API. It answers the
  access pair and the first refresh token, which the app stores as one record. `POST /auth/refresh` is the second,
  and spec `33` owns its rotation, reuse and revocation rules. _Decided here:_ each exemption is one exact method on
  one exact path, so the edge's bypass cannot be widened by a prefix or a query string.
- **The code store is in memory.** The process is single and the lifetime is 60 seconds, so a table and a
  migration would be durability for a value that must not outlive a minute. A restart drops the codes in flight,
  and the app's answer is to start again.
- **A code is consumed on the first exchange attempt, successful or not.** A wrong verifier burns the code, so an
  attacker with the code but not the verifier cannot keep guessing against one code. The rate limit is the second
  layer, not the first.
- **The integration key is configuration, never an image layer.** `PANGOLIN_API_URL`, `PANGOLIN_RESOURCE_ID` and
  `PANGOLIN_INTEGRATION_API_KEY` reach the process as configuration, and the key is a secret with the same handling
  as the edge assertion. The app never holds it, and no request from the app reaches the Integration API.
- **The credential record is stored in `expo-secure-store`, and the app sends `P-Access-Token-Id` and
  `P-Access-Token` on every request.** The record holds the access pair, its local deadline and the refresh token;
  writing it as one value avoids a crash leaving half a credential.
- **The callback is an App Link first and a custom scheme second.** The app configures a verified HTTPS App Link
  and the reverse-DNS scheme `dev.playliberty.app`, and the provisioning route redirects to the HTTPS form when the
  app asks for it. On Android, where SDK 57 offers no `ASWebAuthenticationSession` equivalent, the safety rests on
  the single-use code plus PKCE: an app that intercepts the callback still cannot exchange the code. `Decided here:`
  the verified link is tried first because it is the only form that names the app; the scheme is the fallback
  because a self-hosted origin cannot always be verified.
- **The app treats a missing token at launch as "run provisioning", and a `401` mid-session as the signed-out
  state.** `Decided here:` launching the browser over a playing track is hostile, and the shell already owns the
  signed-out recovery.
- **A failure closes the browser and returns to the app with one sentence.** The app shows the problem's title from
  the exchange, or a single generic sentence when the browser flow never came back, and offers Sign in again. The
  browser sheet is never left open on a dead flow.
- **The token is logged nowhere.** The exchange logs the outcome and the account, never the token, the verifier or
  the code.
- **Inherited constraints are owned by the architecture and not restated here:** identity from the forwarded edge
  headers and fail-closed
  ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)),
  the private deployment
  ([Deployment behind the Pangolin edge](../../ARCHITECTURE.md#deployment-behind-the-pangolin-edge)),
  and the token model
  ([Mobile provisioning](../../ARCHITECTURE.md#mobile-provisioning)).

## Out of Scope

- The optional admin QR fallback, and any provisioning path that does not start from the app.
- iOS build and verification. The flow's iOS shape is recorded and untested.
- A server-issued device-token scheme. Refresh, rotation and revocation moved to spec `33`.
- A second factor, a password, and any authentication the app performs itself.
- Multiple tokens per account, per-device names, and a device list.
- A provisioning screen inside the app beyond the signed-out state the shell owns.
- Deep links other than the provisioning callback, which spec `30` owns.
