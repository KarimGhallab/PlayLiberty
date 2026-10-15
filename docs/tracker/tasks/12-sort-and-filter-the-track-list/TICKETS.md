# 12: Sort and filter the track list

Tickets for [`12-sort-and-filter-the-track-list`](../../specs/12-sort-and-filter-the-track-list.md). One file
per ticket, numbered in dependency order, each declaring its blocking edges. The server tickets are verifiable
through the API; the web tickets through the screen and its tests. One set, `01` to `06`, with the journey last.

| Ticket                                                                                  | Status   | Blocked by                                                                            | Blocks                                                                                |
| --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`01-the-saved-sort-on-a-playlist`](01-the-saved-sort-on-a-playlist.md)                 | resolved | none                                                                                  | [`02`](02-the-detail-sort-control.md), [`04`](04-the-counts-and-the-state-filter.md)  |
| [`02-the-detail-sort-control`](02-the-detail-sort-control.md)                           | resolved | [`01`](01-the-saved-sort-on-a-playlist.md)                                            | [`03`](03-the-saved-sort-is-the-playback-order.md), [`05`](05-the-detail-chip-row.md) |
| [`03-the-saved-sort-is-the-playback-order`](03-the-saved-sort-is-the-playback-order.md) | resolved | [`02`](02-the-detail-sort-control.md)                                                 | [`06`](06-the-arranging-journey.md)                                                   |
| [`04-the-counts-and-the-state-filter`](04-the-counts-and-the-state-filter.md)           | open     | [`01`](01-the-saved-sort-on-a-playlist.md)                                            | [`05`](05-the-detail-chip-row.md)                                                     |
| [`05-the-detail-chip-row`](05-the-detail-chip-row.md)                                   | open     | [`02`](02-the-detail-sort-control.md), [`04`](04-the-counts-and-the-state-filter.md)  | [`06`](06-the-arranging-journey.md)                                                   |
| [`06-the-arranging-journey`](06-the-arranging-journey.md)                               | open     | [`03`](03-the-saved-sort-is-the-playback-order.md), [`05`](05-the-detail-chip-row.md) | none                                                                                  |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- The server tickets are tracer bullets through the contract, the database, the service and its tests. The web
  tickets are tracer bullets through the screen, its read, its store and its tests.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
