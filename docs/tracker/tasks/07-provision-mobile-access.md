# Provision mobile access through browser SSO

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

Implement the mobile provisioning flow from `docs/adr/0008-mobile-provisioning.md` across the server, the edge configuration, and the mobile app.

## Context

Read `docs/adr/0008-mobile-provisioning.md`, `docs/adr/0003-identity-via-pangolin-forwarded-headers.md`, `docs/adr/0006-csrf-defense.md`, and `docs/ARCHITECTURE.md` first.

## Scope

### Server

- A Pangolin Integration API client with configuration `PANGOLIN_API_URL`, `PANGOLIN_RESOURCE_ID`, and an `PANGOLIN_INTEGRATION_API_KEY` secret that is never baked into an image.
- `GET /provision`, authenticated by Pangolin headers: validate `code_challenge`, `redirect_uri`, and `state`; mint a single-use code with a 60-second lifetime bound to `Remote-User`, the redirect URI, and the challenge; redirect to the app. An in-memory code store is acceptable in v1 because the process is single and the lifetime is short.
- `POST /auth/exchange`, exempt from Pangolin SSO: validate the PKCE verifier, consume the code atomically, enforce exact redirect matching and rate limiting, and mint a 180-day Pangolin access token through the Integration API. Return the token.
- Tests for the happy path, a wrong verifier, a reused code, and an expired code.

### Edge

- An exact-path Pangolin SSO bypass for `POST /auth/exchange` only, recorded under `deploy/`, with everything else still behind SSO.

### Mobile

- The provisioning screen: `expo-crypto` for `state` and the PKCE verifier, `WebBrowser.openAuthSessionAsync` to `GET /provision`, a constant-time `state` check, the `POST /auth/exchange` call, and storage in `expo-secure-store`.
- Deep links: attempt the verified HTTPS App Link redirect, fall back to the reverse-DNS custom scheme, and configure both App Links and Universal Links.
- On launch, treat a missing or expired token as "run provisioning", which is the flow from ADR 0008.

## Out of scope

The optional admin QR fallback, iOS verification, and any server-issued device-token scheme.

## Blocking edges

Blocked by `04-scaffold-server` and `06-scaffold-mobile`. It extends both.

## Verification

- An Android development build provisions against a running Pangolin instance, stores the token, and streams a track with the token attached.
- `POST /auth/exchange` rejects a wrong verifier, a reused code, and an expired code.
- `pnpm run build`, `pnpm run lint`, and `pnpm run test` pass.
- The edge bypass applies to `POST /auth/exchange` only; every other path still requires SSO.
