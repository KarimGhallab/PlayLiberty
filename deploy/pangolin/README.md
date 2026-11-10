# Pangolin edge: mobile provisioning

The mobile app is the one client that cannot use the browser's session. It obtains a per-user resource access token
through `GET /provision`, then trades the returned code at `POST /auth/exchange`. That exchange answers a short-lived
access token and a refresh token, and `POST /auth/refresh` rotates the pair without a Pangolin session. The exchange
and the refresh are the only two API requests that must reach the origin without a session; the Android association
file is also public so Android can verify the app's HTTPS links.

## The bypass rules

On the PlayLiberty resource, under **Authentication → Rules**, add three rules above every other:

| Priority | Action      | Match type | Value                         |
| -------- | ----------- | ---------- | ----------------------------- |
| 1        | Bypass Auth | Path       | `.well-known/assetlinks.json` |
| 2        | Bypass Auth | Path       | `auth/exchange`               |
| 3        | Bypass Auth | Path       | `auth/refresh`                |

The association file is inert: it names the Android package and signing-certificate fingerprints, and grants no
access. Path rules match segment by segment, so all three are exact. Do not use `auth/*` or `/*`: a wildcard exposes
more than these paths, and every other path must stay behind Platform SSO, `/provision` included.

The rules only take effect when the resource has at least one authentication method configured. On a resource with
no auth method, Pangolin does not evaluate path rules at all (Pangolin issue 2551), so keep Platform SSO enabled.

## What still guards them

- **No identity, but the assertion.** The bypass removes `Remote-*` from both paths, which is why the server treats
  them as assertion-only: nginx still injects `X-PlayLiberty-Edge`, and the server refuses either one without it.
- **One method on one path each.** The server's assertion-only exemptions are `POST /auth/exchange` and
  `POST /auth/refresh`. A different method on either path still needs identity and fails closed with `401`, so a path
  bypass is not a method bypass.
- **The code and PKCE.** A single-use 60-second code, bound to the user, the redirect URI and the S256 challenge. An
  app that intercepts the callback still cannot exchange the code.
- **The rotating refresh token.** It is stored only as a hash, travels only in the body, and every use replaces it.
- **The rate limits.** Ten attempts per caller per minute on the exchange; ten per caller and ten per family per
  minute on the refresh.

## The Integration API

The server mints access tokens through Pangolin's Integration API, and deletes them at sign-out and on reuse. On the
Pangolin host:

```yaml
# config.yml
flags:
  enable_integration_api: true
server:
  integration_port: 3003
```

Create a root API key under **Server Admin → API Keys**, with permission to create **and delete** resource access
tokens. Both actions are required: sign-out and reuse must end the token at the edge, not only on the phone. Then
give the server:

| Variable                       | Value                                                |
| ------------------------------ | ---------------------------------------------------- |
| `PANGOLIN_API_URL`             | The Integration API base, including `/v1`            |
| `PANGOLIN_RESOURCE_ID`         | The numeric id of the PlayLiberty resource           |
| `PANGOLIN_INTEGRATION_API_KEY` | The API key, supplied as a secret and never baked in |
| `MOBILE_REDIRECT_URIS`         | The callbacks the app may use, comma-separated       |

In production the four values live in one Podman secret, `playliberty_pangolin`, with the keys
`PANGOLIN_API_URL`, `PANGOLIN_RESOURCE_ID`, `PANGOLIN_INTEGRATION_API_KEY` and `MOBILE_REDIRECT_URIS`.
`pnpm deploy:build-for-production` creates and validates the secret; `--replace-pangolin` replaces an existing one.
The integration key is read from `PLAYLIBERTY_PANGOLIN_INTEGRATION_API_KEY` or prompted, never accepted on the
command line.

`MOBILE_REDIRECT_URIS` must include `https://<origin>/auth/callback` and `dev.playliberty.app://provision`. The
build script derives the HTTPS callback from the public origin and adds the scheme.

All three `PANGOLIN_*` values are set together or not at all; a partial set fails the boot. With none of them, the
exchange and the refresh answer `503 provisioning_unavailable` and the rest of the instance is unaffected.

The credential lifetimes are server configuration, not secret: `MOBILE_ACCESS_TOKEN_LIFETIME_SECONDS`,
`MOBILE_REFRESH_TOKEN_LIFETIME_SECONDS` and `MOBILE_FAMILY_LIFETIME_SECONDS`. The defaults and the validation live in
[`loadConfig.ts`](../../apps/server/src/platform/config/loadConfig/loadConfig.ts); the mechanism is
[spec 33](../../docs/tracker/specs/33-refresh-mobile-access.md).
