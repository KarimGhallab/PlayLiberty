# 18: Share a track

Tickets for [`18-share-a-track`](../../specs/18-share-a-track.md). One file per ticket, numbered in
dependency order, each declaring its blocking edges. `01`, `02` and `03` are resolved. The frontier is
`04`; `05` waits on `04`.

| Ticket                                                                                                                | Status   | Blocked by                                                                                          | Blocks                                                            |
| --------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`01-let-the-player-hold-a-queue-with-no-playlist`](01-let-the-player-hold-a-queue-with-no-playlist.md)               | resolved | none                                                                                                | [`04`](04-open-a-track-url-and-hear-it-alone.md)                  |
| [`02-open-a-playlist-at-the-shared-track`](02-open-a-playlist-at-the-shared-track.md)                                 | resolved | none                                                                                                | [`05`](05-resolve-a-shared-link-that-cannot-open-its-playlist.md) |
| [`03-copy-a-track-link-from-its-row`](03-copy-a-track-link-from-its-row.md)                                           | resolved | none                                                                                                | none                                                              |
| [`04-open-a-track-url-and-hear-it-alone`](04-open-a-track-url-and-hear-it-alone.md)                                   | open     | [`01`](01-let-the-player-hold-a-queue-with-no-playlist.md)                                          | [`05`](05-resolve-a-shared-link-that-cannot-open-its-playlist.md) |
| [`05-resolve-a-shared-link-that-cannot-open-its-playlist`](05-resolve-a-shared-link-that-cannot-open-its-playlist.md) | open     | [`02`](02-open-a-playlist-at-the-shared-track.md), [`04`](04-open-a-track-url-and-hear-it-alone.md) | none                                                              |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: it reaches a working end state on its own, however thin, rather than being a layer of a larger change.
- A ticket ends with its verification while it is open: the command or check that proves it is done. A resolved ticket records its outcome and a pointer instead.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
