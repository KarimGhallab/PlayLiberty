# 01: The stream, and a playlist's sync progress reaches the library

**What to build:** A listener pastes a playlist and watches the library update without a reload. The server
gains one long-lived `GET /api/v1/events` that answers `text/event-stream`: it identifies the caller from the
edge headers, subscribes the connection to that account's events, sends a heartbeat so an idle connection stays
open, and removes the connection when it closes. A small in-process bus is what features publish to; the sync
service publishes when a playlist's `syncStatus` moves (`syncing`, then `idle` or `error`) and when its run
starts or settles, naming the accounts that can see the playlist. The web client gains one `EventSource` for
the tab, held by the shell rather than a route, and on each event it invalidates the reads the event names
(`['playlists']` and `['playlist', id]`); on the first `ready` and on every reconnect it invalidates everything
it holds, so a gap is closed. The nginx configuration and the Vite dev proxy must pass the stream unbuffered,
or nothing arrives through the real origin. An event is an invalidation hint and never data: the client
refetches, and no server value is stored. This is the tracer bullet for the whole spec; the later tickets add
producers to the same bus and stream.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] `GET /api/v1/events` answers `text/event-stream`, fails closed without the edge identity headers, and
      carries one event type for a playlist whose sync state changed.
- [ ] A sync started for a playlist the caller can see delivers an event to that caller and to no other account,
      and a second sync settling delivers another.
- [ ] A heartbeat keeps an idle connection open, and a closed connection is removed from the bus.
- [ ] The stream passes unbuffered through nginx and the Vite dev proxy.
- [ ] The web client opens one stream for the tab, and a sync-status event invalidates the library and the
      playlist reads without a reload.
- [ ] The first `ready` and every reconnect invalidate every query the client holds.
- [ ] An e2e test pastes a playlist, watches it appear and settle in the library without a reload, and the
      stream is what the test holds responsible.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.
