# 04: Route every credentialed request through one session

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`

## Outcome

`apps/mobile/src/api/credentialed/` is the one credentialed request module. It owns the access headers, the stream, media and live addresses, the provisioning error and the one-refusal send. The token adapter, the session's revoke request and every stream, media and live surface use it.

The stream probe sends through the module. A `401` renews once through the session's shared flight and retries. A renewed pair reloads the audio source. A failed renewal returns the session verdict, and `endRefusedSession` is the one expiry path for the query client and the audio hook. `usePlayerAudio` no longer calls `sessionStore.expire`.

`useApiConfig` reads `usableAccessToken` and owns no margin. The live stream keeps its backoff and reconnects through the session's shared renewal.

Verification: `pnpm run build`, `pnpm run lint:check`, `pnpm run test:unit` (mobile 631, web 616, server 504, and the other packages), the targeted mobile suites for the credential module, session, API config, stream failure, audio hook and live events, and `pnpm run deps-cruise:check` with no violations.

See [`mobile-architecture-review`](TICKETS.md).
