# 27: Sort and filter the track list on mobile

Tickets for [`27-sort-and-filter-the-track-list`](../../specs/27-sort-and-filter-the-track-list.md). One file per
ticket, numbered in dependency order, each declaring its blocking edges.

Spec [`22`](../../specs/22-read-a-playlist.md) already landed the detail's sort sheet with its three radios and
refusal notice, the six chips with whole-playlist counts, the filter as the read's state parameter, the
filter-empty state with Show all, and both controls disabled while shuffled and for a read collaborator. This set
carries the delta: the queue order, the pinned band and the journey.

Shipped differently: after `02` and `03`, the owner revised the control block to one rail below the header, with a
vertical rule between the sort and the chips and the rail scrolling sideways. The resolved tickets record the pinned
band they were cut against.

| Ticket                                                                                      | Status   | Blocked by                                           | Blocks                              |
| ------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------- | ----------------------------------- |
| [`01-the-saved-sort-orders-the-queue`](01-the-saved-sort-orders-the-queue.md)               | resolved | none                                                 | none                                |
| [`02-the-pinned-sort-and-the-wrapping-chips`](02-the-pinned-sort-and-the-wrapping-chips.md) | resolved | none                                                 | [`03`](03-the-arranging-journey.md) |
| [`03-the-arranging-journey`](03-the-arranging-journey.md)                                   | resolved | [`02`](02-the-pinned-sort-and-the-wrapping-chips.md) | none                                |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through the screen and the behaviour it adds, demoable on its own.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
