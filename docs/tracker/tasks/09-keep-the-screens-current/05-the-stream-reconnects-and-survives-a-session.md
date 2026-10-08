# 05: The stream reconnects, resyncs, and survives an expired session

**Blocked by:** [`01`](01-the-stream-and-a-playlists-sync-progress.md).
**Status:** resolved

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
