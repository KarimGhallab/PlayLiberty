# 05: A refused request retries once before the app signs out

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

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

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
