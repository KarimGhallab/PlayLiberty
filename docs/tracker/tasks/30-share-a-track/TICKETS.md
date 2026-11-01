# 30: Share a track on mobile

Tickets for [`30-share-a-track`](../../specs/30-share-a-track.md). One file per ticket, numbered in dependency order,
each declaring its blocking edges.

The copy and part of the recipient's side already ship. Spec `22` made Copy link universal in the row sheet, with
the absolute URL and both toasts. Spec `23` made the queue hold a bare track and the bar draw it title-only, with
its artwork and no playlist link. This set adds the two route entries, the failing outcomes, the origin-derived App
Link host, and the journey.

| Ticket                                                                                  | Status   | Blocked by                                                                                        | Blocks                                   |
| --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [`01-the-playlist-link-opens-at-its-track`](01-the-playlist-link-opens-at-its-track.md) | resolved | none                                                                                              | [`03`](03-the-links-failing-outcomes.md) |
| [`02-the-bare-track-link-plays-alone`](02-the-bare-track-link-plays-alone.md)           | resolved | none                                                                                              | [`03`](03-the-links-failing-outcomes.md) |
| [`03-the-links-failing-outcomes`](03-the-links-failing-outcomes.md)                     | resolved | [`01`](01-the-playlist-link-opens-at-its-track.md), [`02`](02-the-bare-track-link-plays-alone.md) | [`05`](05-the-link-journey.md)           |
| [`04-the-link-host-is-the-instance-origin`](04-the-link-host-is-the-instance-origin.md) | resolved | none                                                                                              | none                                     |
| [`05-the-link-journey`](05-the-link-journey.md)                                         | resolved | [`03`](03-the-links-failing-outcomes.md)                                                          | none                                     |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
