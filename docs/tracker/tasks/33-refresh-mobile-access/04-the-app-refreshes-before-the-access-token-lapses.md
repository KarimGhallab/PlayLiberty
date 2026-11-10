# 04: The app refreshes before the access token lapses

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

A `Session` class now owns renewal, with `fetch`, the record store and the clock injected. `accessToken` reads the
record, compares its local deadline with the clock, and inside a 60-second margin awaits a refresh before returning
the pair. Outside the margin it returns the stored pair without a request, so an offset device clock cannot force a
refresh per send.

One refresh is in flight per session. `refreshNow` hands every caller the same promise; a rotation writes the single
record, updates the cache and notifies subscribers before that promise resolves. The Promise ordering keeps a failed
write from publishing a pair the store does not hold.

Only a `400` whose problem is exactly `invalid_grant` clears the record and notifies the session ended. A rate limit, a
server fault, a network failure or an unparseable answer throws `SessionRefreshError` and leaves the record untouched.
The module writes no logs.

A version counter guards the record against a sign-out that lands mid-read or mid-refresh: a stale read or an
in-flight rotation cannot put the session back after `clear`.

The app wiring follows the same session. The API client reads its token through `accessToken`, so every read and
mutation pays the margin check. The session status follows the record's notifications, so a refusal anywhere ends the
session. `useApiConfig` subscribes to rotations, so the live event stream and the player's source resolution see the
new pair without a relaunch; on a transient renewal it keeps the current pair while its deadline stands. The
provisioning callback adopts the pair through the session instead of writing the store itself.

The `401` trigger for a clock jump or a token refused at the edge is the same `refreshNow`; ticket `05` wires it.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
