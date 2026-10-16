# 13: Pin a playlist

Tickets for [`13-pin-a-playlist`](../../specs/13-pin-a-playlist.md). One file per ticket, numbered in dependency
order, each declaring its blocking edges. The server tickets are verifiable through the API; the web tickets
through the screen and its tests. One set, `01` to `05`, with the design record's specimen alongside and the
journey last.

| Ticket                                                                                              | Status | Blocked by                                                                             | Blocks                                                                       |
| --------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`01-the-pin-on-a-playlist`](01-the-pin-on-a-playlist.md)                                           | resolved | none                                                                                   | [`02`](02-the-pinned-section-and-the-menu-item.md)                           |
| [`02-the-pinned-section-and-the-menu-item`](02-the-pinned-section-and-the-menu-item.md)             | open   | [`01`](01-the-pin-on-a-playlist.md)                                                    | [`03`](03-the-pin-on-the-cover.md), [`05`](05-the-pinned-gallery-journey.md) |
| [`03-the-pin-on-the-cover`](03-the-pin-on-the-cover.md)                                             | open   | [`02`](02-the-pinned-section-and-the-menu-item.md)                                     | [`05`](05-the-pinned-gallery-journey.md)                                     |
| [`04-the-section-in-the-specimen-and-the-glyphs`](04-the-section-in-the-specimen-and-the-glyphs.md) | open   | none                                                                                   | none                                                                         |
| [`05-the-pinned-gallery-journey`](05-the-pinned-gallery-journey.md)                                 | open   | [`02`](02-the-pinned-section-and-the-menu-item.md), [`03`](03-the-pin-on-the-cover.md) | none                                                                         |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first. `04` has no blockers and can
  start immediately, alongside the set.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- The server tickets are tracer bullets through the contract, the database, the service and its tests. The web
  tickets are tracer bullets through the screen, its read, its store and its tests.
- The documentation this spec decided is already amended: "favorites" has left the three non-goal lists, the
  glossary carries the `Pin` row and its mix-up pair, the library spec carries its forward pointer, and the
  design record carries the section on the pinned section and the pin on the cover. No ticket repeats it.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
