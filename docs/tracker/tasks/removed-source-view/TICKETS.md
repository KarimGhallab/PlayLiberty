# removed-source-view

Tickets for [issue 109](../../issues/109-the-filter-cannot-show-the-tracks-a-removal-left-behind.md), the retained view
in the track filter. One file per ticket, numbered by layer, each declaring its blocking edges.

| Ticket                                                                                        | Status | Blocked by | Blocks |
| --------------------------------------------------------------------------------------------- | ------ | ---------- | ------ |
| [`01-the-shared-layer-learns-a-retained-view`](01-the-shared-layer-learns-a-retained-view.md) | open   | none       | 02, 03 |
| [`02-the-phone-shows-the-retained-view`](02-the-phone-shows-the-retained-view.md)             | open   | 01         | none   |
| [`03-the-web-shows-the-retained-view`](03-the-web-shows-the-retained-view.md)                 | open   | 01         | none   |

## Conventions

- `01` owns everything both clients share: the token, the copy, the design record sentence, the contract and the
  server. `02` and `03` are independent once it lands.
- The decision behind every choice is recorded on the issue, with the rejected alternatives, so a later reader does not
  have to rediscover why the tone is plum or why the chip sits last.
- Resolve a ticket by recording the outcome in the ticket and updating its row here. Do not delete it.
