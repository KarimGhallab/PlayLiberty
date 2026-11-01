# 04: The app refreshes before the access token lapses

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-exchange-issues-the-pair-and-the-app-holds-one-record.md) and
[`02`](02-the-refresh-route-rotates-the-pair.md)

## Outcome

The session module owns renewal. Before a send it compares the current time with the record's local deadline, and
inside a 60-second margin it refreshes first, then sends. There is no background timer: mobile timers are unreliable
while the app is suspended, and the deadline came from a duration, so an offset clock does not cause a refresh per
request.

One refresh is in flight at a time. API reads, mutations, the live event stream and the player's source resolution
await the same promise, so a reconnect or a burst of queries spends one refresh, not one each. A successful refresh
writes the rotated record before the promise resolves, and every caller then reads the new access pair. The record
replacement is a single write, so a crash leaves either the old record or the new one, never half a pair.

A `400 invalid_grant` clears the record and ends the session. A `429`, a `502`, a network failure or an edge redirect
keeps the record and surfaces a retry with backoff. The distinction is the session's decision, not the screen's.

A clock jump after receipt is covered by the same fallback: a refused access token triggers the refresh path rather
than ending the session.

## Acceptance criteria

- [ ] A send inside the 60-second margin refreshes first and then proceeds with the new access pair.
- [ ] Concurrent callers share one in-flight refresh.
- [ ] A successful refresh replaces the record in one write, and an offset device clock does not force a refresh per
      request.
- [ ] Only `invalid_grant` clears the record; transient failures keep it and retry with backoff.
- [ ] No token, refresh token or secret appears in a log line.

## Verification

- Mobile: the session suite runs at its injected seam (`fetch`, `store`, `now`) and proves the margin, the
  single-flight promise, the rotation write, the invalid-grant versus transient split, the atomic record and the clock
  offset.
- The API config follows a refreshed record without a relaunch.
- `pnpm run build` and `pnpm run lint:check` pass.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
