# 08: See the library

Tickets for [`08-see-the-library`](../../specs/08-see-the-library.md). One file per ticket, numbered in
dependency order, each declaring its blocking edges. This spec is the web client's, and the server routes it
reads already exist, so every ticket is verifiable through the component and the two reads it makes.

| Ticket                                                                                      | Status          | Blocked by                                           | Blocks                                                                                            |
| ------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [`01-the-list-and-the-item`](01-the-list-and-the-item.md)                                   | resolved        | none                                                 | [`02`](02-an-empty-gallery-not-an-empty-playlist.md), [`04`](04-a-shared-item-names-its-owner.md) |
| [`02-an-empty-gallery-not-an-empty-playlist`](02-an-empty-gallery-not-an-empty-playlist.md) | resolved        | [`01`](01-the-list-and-the-item.md)                  | [`03`](03-add-a-playlist-from-the-gallery.md)                                                     |
| [`03-add-a-playlist-from-the-gallery`](03-add-a-playlist-from-the-gallery.md)               | ready-for-agent | [`02`](02-an-empty-gallery-not-an-empty-playlist.md) | none                                                                                              |
| [`04-a-shared-item-names-its-owner`](04-a-shared-item-names-its-owner.md)                   | ready-for-agent | [`01`](01-the-list-and-the-item.md)                  | none                                                                                              |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through the component and the reads it makes, demoable on its own.
- The playlist header built in ticket 01 is the shared component; the playlist detail and the player bar reuse it rather than drawing a second item.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
