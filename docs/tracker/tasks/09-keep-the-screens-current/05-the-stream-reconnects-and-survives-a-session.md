# 05: The stream reconnects, resyncs, and survives an expired session

**Status:** resolved

## Outcome

The port gained `onOpen` and `onError`, and the hook now owns the connection's lifecycle rather than leaving it to the browser. The client owns the retry: it closes on `error` and reopens from a timer with a backoff of 1s doubling to 30s, reset by `onOpen`, so a session the edge keeps refusing stops the retry instead of being retried forever, while the `ready` the server sends on every open re-reads everything. A dropped connection is not necessarily an expired session, so on `error` the hook makes an ordinary authenticated read of `/me` that runs the same guard every other request does. A refusal stops the retry and invalidates every read, so the problem reaches a screen through the states that already exist; anything else is transient and the connection is reopened on the backoff.

See [`09-keep-the-screens-current`](../../specs/09-keep-the-screens-current.md).
