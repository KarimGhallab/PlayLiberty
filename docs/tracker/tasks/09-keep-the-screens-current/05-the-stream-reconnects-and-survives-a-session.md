# 05: The stream reconnects, resyncs, and survives an expired session

**What to build:** The stream is long-lived and a tab is opened, closed, slept and resumed, so the client has
to survive a connection that drops and an edge session that has expired. On a reconnect it re-reads every
query it holds, so the gap between the last event and the new connection is closed. When the stream fails, the
client runs the existing re-authentication guard once per tab through an ordinary authenticated read, so a
session that expired while the tab was open is re-established by one navigation and a second refusal is
surfaced as the problem rather than looping. A backoff stops a dead edge from being hammered. The
re-authentication guard itself gains the tests the spec names: the first `401` in a tab navigates, a second is
surfaced as a problem and does not navigate again, and a success clears the record. Reuses the stream from
[ticket 01](01-the-stream-and-a-playlists-sync-progress.md).

**Blocked by:** [`01`](01-the-stream-and-a-playlists-sync-progress.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A dropped stream reconnects and re-reads every query the client holds on reopen.
- [x] A stream failure runs the re-auth guard once per tab; a second failure in the same tab is shown as the
      problem and does not navigate again; a later success clears the record.
- [x] The client backs off rather than reconnecting in a tight loop.
- [x] Unit tests cover the reconnect resync and the guard's once-per-tab behavior.
- [x] Build, lint and the suites pass.

## Outcome

Implemented and verified. The port gained `onOpen` and `onError`, and the hook now owns the connection's
lifecycle rather than leaving it to the browser.

Two decisions worth naming.

The client owns the retry. `EventSource` would reopen on its own, but on a fixed schedule, so a session the edge
keeps refusing would be retried forever. Closing on `error` and reopening from a timer lets a refusal stop the
retry and a transient drop wait longer each time: 1s, doubling to 30s, reset by `onOpen`. The `ready` the server
sends on every connection open is still what re-reads everything, so the reopen closes the gap without a second
mechanism.

A dropped connection is not necessarily an expired session, so on `error` the hook asks a question the API can
answer: an ordinary authenticated read of `/me`, which runs the same guard every other request does. A refusal
stops the retry and invalidates every read, so the problem reaches a screen through the states that already
exist; anything else is transient and the connection is reopened on the backoff.

Tests: three in `client.test.ts` for the guard (the first `401` navigates and records the attempt, a second in
the tab surfaces the problem without navigating, a success clears the record) and three in
`useEventStream.test.tsx` for recovery (a reopen on the backoff re-reads everything, the backoff doubles, a
refusal stops the retry and re-reads). jsdom's `location.assign` is a non-writable own property, so the tests
replace the whole `location` object through a small helper in `src/testing/location.ts` rather than spying in
place.

Verification: `pnpm run build`, `pnpm run lint`, `pnpm test:unit` (web 292, server 259, packages green) and
`pnpm --filter @playliberty/e2e exec playwright test` (24 passed, 1.2m) all pass. No em dashes. Not committed.
