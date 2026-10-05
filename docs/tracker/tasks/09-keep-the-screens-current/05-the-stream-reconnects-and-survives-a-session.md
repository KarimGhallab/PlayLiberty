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

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A dropped stream reconnects and re-reads every query the client holds on reopen.
- [ ] A stream failure runs the re-auth guard once per tab; a second failure in the same tab is shown as the
      problem and does not navigate again; a later success clears the record.
- [ ] The client backs off rather than reconnecting in a tight loop.
- [ ] Unit tests cover the reconnect resync and the guard's once-per-tab behavior.
- [ ] Build, lint and the suites pass.
