# 04: Curate a playlist

Tickets for [`04-curate-a-playlist`](../../specs/04-curate-a-playlist.md). One file per ticket, numbered in
dependency order, each declaring its blocking edges. This spec is server-only, so every ticket is verifiable
through the API; the overflow menu and the add-a-track dialog belong to the web half, which landed later in
[`WEB_TICKETS.md`](WEB_TICKETS.md) rather than in
[`09-keep-the-screens-current`](../../specs/09-keep-the-screens-current.md), where this file first sent them and
where nothing picked them up.

| Ticket                                                                              | Status   | Blocked by                                     | Blocks                                           |
| ----------------------------------------------------------------------------------- | -------- | ---------------------------------------------- | ------------------------------------------------ |
| [`01-record-the-batch-add-route-shape`](01-record-the-batch-add-route-shape.md)     | resolved | none                                           | [`02`](02-add-a-video-to-several-playlists.md)   |
| [`02-add-a-video-to-several-playlists`](02-add-a-video-to-several-playlists.md)     | resolved | [`01`](01-record-the-batch-add-route-shape.md) | none                                             |
| [`03-rename-a-playlist`](03-rename-a-playlist.md)                                   | resolved | none                                           | none                                             |
| [`04-delete-a-playlist`](04-delete-a-playlist.md)                                   | resolved | none                                           | none                                             |
| [`05-remove-a-track-from-a-playlist`](05-remove-a-track-from-a-playlist.md)         | resolved | none                                           | [`07`](07-a-returned-video-is-treated-as-new.md) |
| [`06-retry-a-failed-track`](06-retry-a-failed-track.md)                             | resolved | none                                           | none                                             |
| [`07-a-returned-video-is-treated-as-new`](07-a-returned-video-is-treated-as-new.md) | resolved | [`05`](05-remove-a-track-from-a-playlist.md)   | none                                             |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through a route, its service, its contract and its tests, demoable on its own.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
