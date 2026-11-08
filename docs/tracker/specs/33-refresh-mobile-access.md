# Refresh mobile access

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

A signed-in phone holds one Pangolin resource access token that lives for 180 days. If that token is copied, the edge accepts it for six months. Signing out only deletes it from the device; the token stays valid at the edge, so a lost or handed-over phone cannot be cut off from the app. The app has no way to renew a credential, which is why the life cannot simply be shortened: every lapse would send the user through the browser again. The 180 days is also a hard-coded constant, although the earlier spec calls it a configuration change.

## Solution

The app obtains a short-lived access token and a long-lived refresh token at provisioning. The access token lasts 12 hours and is renewed silently before it lapses. The refresh token lasts 180 days of use, capped at one year, and is rotated on every use, so a copied token is detected when the legitimate holder next refreshes. Sign-out revokes the refresh family and every unexpired access token at the edge. The refresh credential is the second, exact, method-scoped path outside Pangolin SSO. The web client keeps its browser session and is not changed.

## Implementation Decisions

### Credential model

- The mobile client holds two credentials. The access token is a Pangolin resource access token, lasts 12 hours by default, is minted by the server through the Integration API, and is sent to the edge as the existing token id and secret pair. _Decided here:_ 12 hours, because the native player keeps the token it was built with.
- The refresh token is a 256-bit random value in base64url, issued by the server, stored only as a SHA-256 hash. _Decided here:_ the server owns the refresh token rather than Pangolin, because Pangolin has no refresh mechanism.
- A refresh token lasts 180 days from its issue, and each successful refresh issues one that expires 180 days later, clamped to the family's absolute expiry. The family expires one year after first provisioning. _Decided here:_ the sliding window preserves the no-scheduled-SSO experience while the cap bounds the secret.
- One family per provisioning, one provisioning per install. There are no device names, no device list, and no sign-out-all. _Decided here:_ a device list is a screen and a revocation surface the product has not designed.
- A normal refresh does not revoke the previous access token. _Decided here:_ an open stream or live-event connection may still hold it, so it is allowed to expire on its own.
- The access token title carries the family id's short prefix, so an operator can match a Pangolin token to a family without exposing a secret.

### First provisioning

- The provisioning route and the 60-second PKCE code are unchanged. The exchange still creates no account.
- The exchange now answers the token pair, and creates the family plus its first refresh token. The shape is:

```json
{
  "access": {
    "id": "pangolin-access-token-id",
    "secret": "pangolin-access-token-secret",
    "expires_at": "2026-10-30T12:00:00.000Z",
    "expires_in": 43200
  },
  "refresh": {
    "token": "opaque-refresh-token",
    "expires_at": "2027-04-28T12:00:00.000Z",
    "expires_in": 15552000
  }
}
```

- `expires_at` is the absolute expiry in ISO 8601 UTC: the Pangolin token's own expiry for the access pair, and the sliding window clamped to the family cap for the refresh token. `expires_in` is the same lifetime as whole seconds from the response. The server keeps the absolute value; the client schedules from the relative one. _Decided here:_ both fields, because the absolute value is the record and the relative value is the only safe scheduling input when a device clock is wrong.
- The exchange and refresh share one token-pair schema, so the client has one record shape.

### The refresh endpoint

- The path is `POST /auth/refresh`. It is the second and only new path outside Pangolin SSO, matched exactly, with no wildcard. _Decided here:_ a separate path keeps the exchange's two grants apart and leaves its audit and rate limit independent.
- The edge bypass removes all identity headers, and Badger strips any access-token headers on every HTTP path, so the refresh token in the body is the only credential the server sees. The server authenticates it itself.
- The request body is `{ "refresh_token": "..." }`. The response is the token pair above. The response is `Cache-Control: no-store`.
- The path is assertion-only at the server, like the exchange: it requires the edge assertion and no forwarded identity. The exemption is method-scoped, so a `GET` or `PUT` on the same path reaches the server without identity and is refused.
- The server applies 10 attempts per minute per caller and 10 per minute per family. _Decided here:_ the family cap stops one family from consuming the caller's budget.
- Refusals are `400 invalid_grant` with no detail for an unknown, expired, consumed, or revoked token, and for a user who is no longer a member. `429` is the rate limit, `503` is an unconfigured integration, and `502` is a Pangolin failure. The app distinguishes these.
- The refresh token travels only in the body, never in a URL, a query string, or a log line.

### Rotation, grace, and reuse

- The server mints the new access token before it consumes the refresh token. On a Pangolin failure the presented refresh token stays valid and the request answers `502`; the client retries. _Decided here:_ a failed refresh must not destroy the only credential the app holds.
- A family-level, 30-second, in-memory cache holds the latest full response. A replay of a consumed token in that family inside the grace returns the same response; outside it, the replay is reuse. _Decided here:_ returning the same pair handles both a lost response and a race, where rotating again would let one client store a token the server has already superseded.
- Reuse revokes the family and every unexpired access token issued to it, answers `invalid_grant`, and writes a distinct audit event. The cache is process-local; a restart drops it, so a replay after a restart is treated as reuse. The architecture is one process, so no shared cache is built.
- A new refresh token expires at the earlier of 180 days from now and the family's absolute expiry. The access token's `validForSeconds` is the earlier of 12 hours and the family's remaining life, so the access token cannot outlive the family.
- If the Pangolin user is no longer a member, the family is revoked and the refusal is `invalid_grant`. If Pangolin is unavailable, the refresh token is not consumed and the answer is `502`.

### Storage

- A refresh family row holds its id, account id, Pangolin user id, creation time, last use, absolute expiry, and revocation time.
- A refresh token row holds its id, family id, SHA-256 hash, expiry, and consumption time. The plaintext exists only in the client and in the 30-second grace cache.
- An access token row holds the Pangolin token id, family id, expiry, and revocation time. It never holds the secret. _Decided here:_ the row exists because sign-out and reuse must delete every unexpired token, not only the latest.
- Expired family, refresh token, and access token rows are removed by the existing weekly prune.
- The table set is a new database migration. There is no migration of client credentials; the app is not live, so an install provisions again.

### Sign-out and revocation

- Sign-out is a server call, `POST /api/v1/session/revoke`, behind the edge and authenticated by the access token, with `{ "refresh_token": "..." }` in the body. It revokes the family and deletes every unexpired access token at Pangolin. _Decided here:_ the revoke path stays behind the edge rather than taking a third SSO exemption, because the app can refresh first when its access token has lapsed.
- The server checks that the family belongs to the account the edge authenticated. A mismatch is a no-op success, so the endpoint reveals nothing about another account.
- The client ensures it has a valid access token before calling revoke, refreshing first when necessary. If that is impossible, it clears the device record and leaves the family to expire. Sign-out is best effort; a Pangolin or network failure never blocks the local clear.
- The reuse path uses the same server revocation, so detection and sign-out share one code path.
- Deleting a token in the Pangolin UI is not a revocation channel for the app: the app refreshes and mints a new one. Revocation is sign-out, family revocation, or the caps. No admin kill switch is built.

### Client

- The two separate SecureStore keys become one JSON session record holding the access id, the access secret, the local access deadline, the refresh token, and the refresh expiry. The deadline is computed at receipt as `receivedAt + expires_in * 1000`, not copied from the server's `expires_at`, so a phone whose clock is offset does not treat every new token as already expired. It is written atomically after a refresh and deleted on sign-out. _Decided here:_ one record avoids a crash leaving half a credential pair.
- Before every send, the client compares the current time with the local access deadline. Inside a 60-second margin it refreshes first, then sends. _Decided here:_ just-in-time, not a background timer, because mobile timers are unreliable when the app is suspended, and a clock offset cannot cause a refresh per request because the deadline came from a duration. A clock jump after receipt is still covered by the fallback.
- One in-flight refresh promise is shared by API reads, mutations, the live event stream, and the player's source resolution. Callers await the same result.
- A `401` from the edge triggers the same refresh once, then one retry. A second `401` after a fresh token is a definitive refusal.
- Only `400 invalid_grant` clears the session. `429`, `502`, network failures, and an edge redirect on the bypass path keep the session and surface a retry with backoff. The current rule that any API `401` signs out moves behind the refresh attempt.
- Every request that reaches the edge, including the audio source, carries an explicit Android User-Agent that Badger classifies as a non-browser client. The non-JSON response guard remains as the second layer. iOS is not a target; its `302` behavior is recorded for when it becomes one.
- Sign-out clears the local record, the query cache, and the player, and asks the server to revoke when it can.
- The player does not rebuild an existing native source on refresh. A queue that plays longer than the access token's 12 hours may fail on a later range request; that is an accepted v1 limitation, and shortening the access life requires a stream recovery path first.
- The live event stream refreshes on a `401`, reconnects, and expires only on `invalid_grant`.

### Configuration and deployment

- Three server environment values replace the hard-coded lifetime: the access lifetime (default 12 hours), the refresh lifetime (default 180 days), and the family cap (default one year). All are positive integers in seconds, validated so the refresh does not exceed the cap and the access does not exceed the cap. They are configuration, not secrets.
- The production Pangolin key needs the delete action in addition to generation. The deployment notes record it. No build-time Pangolin call is added.
- The edge configuration gains a second exact bypass, `auth/refresh`, above the SSO rule. The nginx origin gains an exact location for the same path. The dev proxy gains the path so the Android development build can refresh.
- The access-token headers remain stripped by the edge on every HTTP path; the server continues to see only the forwarded identity. No server route reaches for those headers.

### Contracts

- The token pair is one shared schema, used by both the exchange and refresh responses, carrying the absolute `expires_at` and the relative `expires_in` for each credential.
- The refresh request and the revoke request each have a schema for the refresh token.
- The existing problem codes cover every refusal; no new code is added.
- The revoke endpoint answers `204`, including when the family is already gone or belongs to another account.
- **This spec supersedes spec `20`'s lifetime, refresh and revocation clauses.** Every other provisioning decision stands.
- **The grace cache is process-local.** A multi-process deployment would need a shared store, or it would treat every race as reuse.
- **The development proxy and the Android build need the refresh path** for the provisioning journey to keep working end to end.

## Out of Scope

- iOS builds and verification, including its browser redirect behavior. The code stays cross-platform and the claim is Android's.
- A device list, device names, and sign-out-all.
- An admin kill switch or a family management screen.
- Deleting a token in the Pangolin UI as a revocation channel.
- Refresh for the web client, which keeps its Pangolin session.
- Stream recovery at an access lifetime shorter than 12 hours.
- Migration of existing client credentials.
- Refresh tokens in URLs, device attestation, and DPoP-style binding.
- Revoking an old family when an install provisions again; it expires by the idle window or the cap.
