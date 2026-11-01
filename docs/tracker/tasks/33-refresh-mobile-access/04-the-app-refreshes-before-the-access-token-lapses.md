# 04: The app refreshes before the access token lapses

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-exchange-issues-the-pair-and-the-app-holds-one-record.md) and
[`02`](02-the-refresh-route-rotates-the-pair.md)

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

## Verification

- Mobile: 489 tests across 54 suites. The session suite runs at the injected seam and proves the margin on both
  sides, the single-flight between concurrent callers, the one-write rotation and its notification, the duration-based
  deadline under a skewed absolute expiry, the invalid-grant clear, the four transient cases that keep the record, and
  the sign-out-mid-flight guard. The API config suite proves a rotated record reaches the config without a relaunch.
  The status and callback suites follow the session.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- On `emulator-5554`, a kill and relaunch opened the signed-in library and loaded its playlists through the session's
  token path.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
