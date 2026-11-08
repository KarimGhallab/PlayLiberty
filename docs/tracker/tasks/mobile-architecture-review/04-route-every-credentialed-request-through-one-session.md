# 04: Route every credentialed request through one session

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Observed

A JSON read or command goes through the transport and its token adapter. A `401`
renews the pair once and retries. A refused pair becomes `NeedsProvisioningError`,
the query client reports it, and the app expires the session.

The stream, the cover and thumbnail reads, and the live event stream bypass the
transport. They build their own address and headers. As a result:

- A refused stream never renews. The stream classifier reads the status and the
  audio hook clears the queue and expires the session, so a transient refusal
  ends the session.
- The live stream has its own renewal and reconnect loop.
- `useApiConfig` repeats the deadline check without the session's 60-second
  margin.

Six modules therefore own part of the refused-credential policy.

## Expected

One module builds every credentialed address: the JSON transport, the stream,
the cover and thumbnail reads, and the live events. Callers ask that module for
the address and headers, or for the request. `accessHeaders` has one caller.

One module owns the refused-credential verdict. A `401` from any request renews
once through the session's shared renewal flight. A successful renewal retries
the request. A failed renewal ends the session through the same path as a JSON
read. The live stream still backs off and reconnects on a drop.

`useApiConfig` reads the pair from the session. It does not recompute the margin.

## Evidence

`apps/mobile/src/api/tokenAdapter/tokenAdapter.ts` renews once on a `401` and
throws `NeedsProvisioningError` when the renewal fails, at lines 47 to 63.
`apps/mobile/src/api/queryClient/queryClient.ts` maps that error to `onRefused`,
and `apps/mobile/src/providers/AppProviders.tsx` expires the session.

`apps/mobile/src/player/streamFailure/streamFailure.ts` re-asks the stream route
with a `HEAD` and returns the shared verdict. `apps/mobile/src/player/usePlayerAudio/usePlayerAudio.ts`
turns `StreamFailureKind.Session` into `clear()` and `sessionStore.expire()` at
lines 144 to 162. This path never renews.

`apps/mobile/src/live/useLiveEvents/useLiveEvents.ts` renews on
`LiveEventFailure.Refused` and reconnects, at lines 85 to 108.

`apps/mobile/src/api/streamSource.ts`, `apps/mobile/src/shared/media/mediaSource.ts`
and `apps/mobile/src/live/eventsSource.ts` each import `accessHeaders` and
`apiUrl`, and each builds a `{ uri, headers }` address outside the transport.

`apps/mobile/src/auth/useApiConfig.ts` compares `record.accessDeadline` to
`Date.now()` at line 57, while `apps/mobile/src/auth/session/session.ts` owns
`ACCESS_MARGIN_MS` at line 31 and the renewal flight at lines 86 to 121.

The report for this review is `/tmp/architecture-review-20261108-151358.html`,
candidate 1.

## Acceptance criteria

- [x] One exported mobile module returns the address and headers for any API
      endpoint, or performs the credentialed request. The stream, media and live
      surfaces use it.
- [x] No module outside that credential module imports `accessHeaders` or writes
      the access headers itself.
- [x] A stream `401` renews through the session once and retries the stream. A
      failed renewal ends the session through the same path as a JSON `401`.
- [x] A live `401` uses the same renewal flight. A dropped live stream still
      backs off and reconnects.
- [x] `useApiConfig` does not compare `accessDeadline` to `Date.now()` and does
      not own a margin.
- [x] `usePlayerAudio` does not call `sessionStore.expire()` directly. It reports
      the refusal to the one verdict.
- [x] Tests cover a stream `401` with a successful renewal, a stream `401` with a
      failed renewal, a live refusal sharing the renewal, and a media address
      built by the credential module.

## Outcome

`apps/mobile/src/api/credentialed/` is the one credentialed request module. It
owns the access headers, the stream, media and live addresses, the provisioning
error and the one-refusal send. The token adapter, the session's revoke request
and every stream, media and live surface use it.

The stream probe sends through the module. A `401` renews once through the
session's shared flight and retries. A renewed pair reloads the audio source.
A failed renewal returns the session verdict, and `endRefusedSession` is the one
expiry path for the query client and the audio hook. `usePlayerAudio` no longer
calls `sessionStore.expire`.

`useApiConfig` reads `usableAccessToken` and owns no margin. The live stream
keeps its backoff and reconnects through the session's shared renewal.

Verification: `pnpm run build`, `pnpm run lint:check`, `pnpm run test:unit`
(mobile 631, web 616, server 504, and the other packages), the targeted mobile
suites for the credential module, session, API config, stream failure, audio
hook and live events, and `pnpm run deps-cruise:check` with no violations.

## Verification

`pnpm --filter @playliberty/mobile exec jest src/api src/auth src/player/streamFailure src/player/usePlayerAudio src/live`, `pnpm run build`, `pnpm run lint:check`.
