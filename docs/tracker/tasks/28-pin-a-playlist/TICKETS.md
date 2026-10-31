# 28: Pin a playlist on mobile

Tickets for [`28-pin-a-playlist`](../../specs/28-pin-a-playlist.md). One file per ticket, numbered in dependency
order, each declaring its blocking edges.

The code half already ships. Spec [`21`](../../specs/21-see-the-library.md) built the gallery's pin: the Pin and
Unpin item, the reader's sheet, the optimistic patch, the Pinned heading and the horizontal pinned row. Spec
[`13`](../../specs/13-pin-a-playlist.md) owns the per-account table, the route, the name order and the no-event rule.
The one clause left is the journey's unpin half.

| Ticket                                        | Status   | Blocked by | Blocks |
| --------------------------------------------- | -------- | ---------- | ------ |
| [`01-the-pin-journey`](01-the-pin-journey.md) | resolved | none       | none   |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
