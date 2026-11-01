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

## User Stories

1. As a new user, I want to sign in from the app, so that I do not need a laptop to start listening.
2. As a new user, I want the sign-in to happen in my browser, so that I can use the password manager and the second factor I already have.
3. As a new user, I want to return to the app automatically, so that I do not have to switch back by hand.
4. As a new user, I want the app to keep me signed in for months, so that I am not provisioning every week.
5. As a security-minded user, I want the long-lived token never to appear in a URL, so that it cannot leak through history or a screenshot.
6. As a security-minded user, I want a stolen code to be useless without the app's verifier, so that an intercepted redirect is not a session.
7. As a security-minded user, I want a code to work once and expire in a minute, so that a replay has nothing to replay.
8. As an account, I want my token to be mine alone, so that two people on the instance never share one.
9. As an account, I want the token to be attached to every request, so that the server sees the same identity the edge does.
10. As an account, I want a refused credential to send me back to sign-in, so that I am never stuck on a dead screen.
11. As a user on Android, I want the callback to reach the app even when the browser cannot verify the link, so that provisioning is not a dead end.
12. As a user on Android, I want a malicious app not to be able to receive my code, so that installing an app cannot steal my account.
13. As a user on iOS, I want the callback to reach only the app that started it, so that the same guarantee holds there.
14. As an operator, I want the exchange to be rate limited, so that a code cannot be brute forced.
15. As an operator, I want the credential paths to be the only paths outside SSO, each exact and method-scoped, so that the rest of the instance stays behind the edge.
16. As an operator, I want the integration key to stay out of the image, so that a leaked image is not a leaked credential.
17. As an operator, I want an exchange failure to be logged without the token, so that debugging does not create a second leak.
18. As an operator, I want the code store to be in memory, so that the flow needs no schema.
19. As an operator, I want an exact redirect match, so that a modified redirect cannot exfiltrate a code.
20. As an operator, I want a failed provisioning to leave no account behind, so that a half-finished flow changes nothing.
21. As an account, I want the app to start provisioning only when it has no usable token, so that a valid session is never re-run.
22. As an account, I want a valid token to survive a restart, so that I stay signed in.
23. As an account, I want Sign out to revoke the credential at the edge and remove it from the device, so that handing over the phone ends my access.
24. As an account, I want the browser to be closed on a refusal, so that I am not left in a flow that cannot finish.
25. As a French-speaking user, I want the provisioning screen and its failures in French, so that the flow is readable.
26. As a user, I want a refused provisioning to say what went wrong, so that I can try again rather than guess.
27. As a developer, I want the flow tested for a wrong verifier, a reused code and an expired code, so that the three ways it can fail are proven.
28. As a developer, I want the server to be the only holder of the integration key, so that the app holds no secret but its own token.

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

## Testing Decisions

- A test earns its place only if it fails when the credential flow's guarantees change. The tests assert the
  exchange's answers for a valid flow and for each of its three refusals, that the bypass reaches one path only,
  and that a refused token lands on the signed-out state. They do not assert the token's format, the store's
  encryption, or the browser sheet's presentation.
- **The server is tested at the provisioning routes' inject seam**, with the Integration API stubbed: a valid
  exchange answers a token pair; a wrong verifier, a reused code and an expired code each answer their refusal; a
  redirect URI that differs by one character is refused; the rate limit answers after its threshold. Prior art is
  the existing route tests with a stubbed edge.
- **The edge's bypass is tested where the edge configuration is tested**: the exact path is exempt and every other
  path, including the same path with a different method, is not.
- **The app's half is tested at the provisioning module's seam**, with the browser sheet and the network stubbed:
  the state is compared before the exchange, a mismatch ends the flow without a request, a refusal returns to the
  app with a sentence, and a success writes the session record. Prior art is the web's `apiClient` tests.
- **The critical journey is a Maestro flow against a running instance**: a signed-out app provisions through the
  browser and streams a track afterwards. It is the only test that proves the App Link and the edge together.
- **Cut tests:** no test of the code's random distribution or the integration client's HTTP shape beyond the request
  it makes.

## Out of Scope

- The optional admin QR fallback, and any provisioning path that does not start from the app.
- iOS build and verification. The flow's iOS shape is recorded and untested.
- A server-issued device-token scheme. Refresh, rotation and revocation moved to spec `33`.
- A second factor, a password, and any authentication the app performs itself.
- Multiple tokens per account, per-device names, and a device list.
- A provisioning screen inside the app beyond the signed-out state the shell owns.
- Deep links other than the provisioning callback, which spec `30` owns.

## Further Notes

- The credential lifetimes are configuration, not an app change: `MOBILE_ACCESS_TOKEN_LIFETIME_SECONDS` (default 12
  hours), `MOBILE_REFRESH_TOKEN_LIFETIME_SECONDS` (default 180 days) and `MOBILE_FAMILY_LIFETIME_SECONDS` (default one
  year). Spec `33` owns the refresh, reuse and revocation rules that use them.
- The custom scheme is a fallback with a known weakness on Android. It is accepted because the code plus PKCE is
  what protects the exchange, and because a self-hosted instance cannot guarantee a verified App Link.
