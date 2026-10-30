# Pangolin edge: mobile provisioning

The mobile app is the one client that cannot use the browser's session. It obtains a per-user resource access token
through `GET /provision`, then trades the returned code at `POST /auth/exchange`. The exchange is the only request
that must reach the origin without a Pangolin session, because the app has no credential yet.

## The one bypass rule

On the PlayLiberty resource, under **Authentication → Rules**, add one rule above every other:

| Priority | Action      | Match type | Value           |
| -------- | ----------- | ---------- | --------------- |
| 1        | Bypass Auth | Path       | `auth/exchange` |

Path rules match segment by segment, so `auth/exchange` is exact. Do not use `auth/*` or `/*`: a wildcard exposes
more than the exchange, and every other path must stay behind Platform SSO, `/provision` included.

The rule only takes effect when the resource has at least one authentication method configured. On a resource with
no auth method, Pangolin does not evaluate path rules at all (Pangolin issue 2551), so keep Platform SSO enabled.

## What still guards the exchange

- **No identity, but the assertion.** The bypass removes `Remote-*` from the exchange, which is why the server treats
  it as assertion-only: nginx still injects `X-PlayLiberty-Edge`, and the server refuses the exchange without it.
- **One method on one path.** The server's assertion-only exemption is `POST /auth/exchange`. A different method on
  the same path still needs identity and fails closed with `401`, so the path bypass is not a method bypass.
- **The code and PKCE.** A single-use 60-second code, bound to the user, the redirect URI and the S256 challenge.
  An app that intercepts the callback still cannot exchange the code.
- **The rate limit.** Ten attempts per caller per minute.

## The Integration API

The server mints the token through Pangolin's Integration API. On the Pangolin host:

```yaml
# config.yml
flags:
  enable_integration_api: true
server:
  integration_port: 3003
```

Create a root API key under **Server Admin → API Keys**, with permission to create resource access tokens. Then give
the server:

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
exchange answers `503 provisioning_unavailable` and the rest of the instance is unaffected.
