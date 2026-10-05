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

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] `GET /api/v1/events` answers `text/event-stream`, fails closed without the edge identity headers, and
      carries one event type for a playlist whose sync state changed.
- [x] A sync started for a playlist the caller can see delivers an event to that caller and to no other account,
      and a second sync settling delivers another.
- [x] A heartbeat keeps an idle connection open, and a closed connection is removed from the bus.
- [x] The stream passes unbuffered through nginx and the Vite dev proxy.
- [x] The web client opens one stream for the tab, and a sync-status event invalidates the library and the
      playlist reads without a reload.
- [x] The first `ready` and every reconnect invalidate every query the client holds.
- [x] An e2e test creates a playlist outside the tab, watches it appear and settle in the library without a
      reload, and the stream is what the test holds responsible.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

## Outcome

Implemented and verified. The stream is one route, one bus and one client connection, and the sync service is
its first publisher.

Three decisions worth naming.

The bus is generic and lives in `shared/events/`, not typed to the live event: it is a map of channel to
listener, where a channel is an account id, so it carries no domain vocabulary and a test drives it with a
string. The event vocabulary is the contract's (`LiveEventType`, `LiveEventSchema`), shared by both sides, so a
new event kind is a compile error on the server and a parse miss on the client rather than a silent drift.

An event is an invalidation hint and never data. `playlist.changed` names the playlist and nothing else; the
client maps it to `['playlists']` and `['playlist', id]` and refetches. `ready` is sent on every connection
open, so a reconnect re-reads everything the tab holds, which is the reconnect resync without a timer. The
audience is `playlistAudience`, the owner and every collaborator, which is the same rule that decides who may
see the playlist.

The client factory is a seam: jsdom has no `EventSource` and MSW cannot fake one, so `EventStreamContext`
supplies the factory, `browserEventStream` is the default, and a test injects a fake and emits frames. The real
wire is the e2e's.

`apps/web/deploy/nginx.conf` gained an exact `location = /api/v1/events` with buffering off and a read timeout
longer than the heartbeat; the Vite dev proxy needed nothing, and the e2e proves it streams.

Tests: six in `EventBus.test.ts` (delivery, isolation, dedup, fan-out, unsubscribe), five in
`eventRoutes.test.ts` over a real socket (identity, ready and heartbeat, delivery to the owner, delivery to a
collaborator, isolation from a stranger), two in `liveEvents.test.ts` (ready, playlist change) and five in
`useEventStream.test.tsx` (one connection, ready, playlist change, unknown frame, close on unmount). The e2e
`live.spec.ts` creates the playlist through the API rather than the dialog, so the tab never asked about it:
the only way the library gains the row is the pushed event, and the title it shows is one the tab never
fetched.

Verification: `pnpm run build`, `pnpm run lint`, `pnpm test:unit` (server 259, web 286, packages green) and
`pnpm --filter @playliberty/e2e exec playwright test live` (1 passed, 8.1s) all pass. No em dashes. Not
committed.
