# 01: The stream, and a playlist's sync progress reaches the library

**Blocked by:** None. Can start immediately.
**Status:** resolved

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
