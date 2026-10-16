# 01: The stream, and a playlist's sync progress reaches the library

**Status:** resolved

## Outcome

The stream is one route, one bus and one client connection, and the sync service is its first publisher. The bus lives in `shared/events/` as a map of channel to listener where a channel is an account id, the event vocabulary is the contract's (`LiveEventType`, `LiveEventSchema`), and an event is an invalidation hint and never data: `playlist.changed` names the playlist and the client maps it to `['playlists']` and `['playlist', id]`. `ready` is sent on every connection open so a reconnect re-reads everything, the audience is `playlistAudience` (the owner and every collaborator), and `EventStreamContext` supplies the client factory with `browserEventStream` as the default. `apps/web/deploy/nginx.conf` gained an exact `location = /api/v1/events` with buffering off and a read timeout longer than the heartbeat, while the Vite dev proxy needed nothing.

See [`09-keep-the-screens-current`](../../specs/09-keep-the-screens-current.md).
