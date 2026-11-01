# 05: A refused request retries once before the app signs out

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`04`](04-the-app-refreshes-before-the-access-token-lapses.md)

## Outcome

A `401` is now a renewal trigger. The API client asks the session for a pair once, retries the request once with it,
and settles the retry. A second `401` throws a plain `ApiError`, which the screen surfaces without ending the session.
A renewal that returns null means the session ended on `invalid_grant`, so the client asks for provisioning; a renewal
that throws transiently propagates after one attempt.

`Session.renewAccessToken(refused)` compares the refused pair with the record: a pair another caller already rotated
is reused, so a burst of `401`s spends one rotation, and only an unchanged pair forces a refresh.

Every request that reaches the edge now carries `User-Agent: PlayLiberty/1.0 (Android)`: API reads and mutations, the
session refresh, the provisioning exchange, the audio and cover sources, the stream-failure probe, and the live event
stream. Badger sees a non-browser client and answers JSON rather than an SSO page. The session's non-JSON answer stays
a transient renewal failure, covered by its suite.

The live event stream renews on a `401` and reconnects. It never signs out by itself: a renewal that ends the session
stops the loop, and a transient renewal failure backs off and retries. The sign-out path stays the session's, driven
only by `invalid_grant`.

The player no longer clears its loaded source when the resolver changes. A stream that is already playing keeps the
token it was built with, and the next track resolves with the current pair. A queue that outlives the 12-hour access
token can still fail on a later range request; that remains the accepted v1 limit.

## Verification

- Mobile: 497 tests across 54 suites. The API client suite proves the one renewal and one retry with the new pair, the
  second-`401` failure that is not a provisioning refusal, the ended-session renewal, the transient renewal without a
  retry, and the header set including the User-Agent. The session suite proves the reuse of a pair another caller
  rotated and the forced renewal of the refused one, plus the User-Agent on the refresh request. The live stream suite
  proves the renew-and-reconnect, the stop when the renewal ends the session, and the transient backoff. The player
  suite proves the source is not rebuilt when the resolver changes, and the next track takes the new resolver's pair.
  The remaining header assertions gained the User-Agent.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- On `emulator-5554`, a kill and relaunch opened the signed-in library and loaded its playlists through the client
  that now sends the agent and renews on refusal.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
