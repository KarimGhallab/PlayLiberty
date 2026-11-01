# 31: Manage the egress on mobile

Tickets for [`31-manage-the-egress`](../../specs/31-manage-the-egress.md). One file per ticket, numbered in
dependency order, each declaring its blocking edges.

The `/egress` route stub and the admin's door in the library header already ship from `21`. This set adds the shared
country lookup, the pool read behind the route's guard, the two actions, and the journey. The door stays in the
library header; ticket `04` corrects spec `31`'s account-sheet sentences to match it.

| Ticket                                                                                                          | Status          | Blocked by                                                     | Blocks                                                         |
| --------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| [`01-the-country-lookup-is-one-module`](01-the-country-lookup-is-one-module.md)                                 | resolved        | none                                                           | [`02`](02-the-console-reads-the-pool-behind-the-admin-gate.md) |
| [`02-the-console-reads-the-pool-behind-the-admin-gate`](02-the-console-reads-the-pool-behind-the-admin-gate.md) | ready-for-agent | [`01`](01-the-country-lookup-is-one-module.md)                 | [`03`](03-the-two-actions-and-the-busy-card.md)                |
| [`03-the-two-actions-and-the-busy-card`](03-the-two-actions-and-the-busy-card.md)                               | ready-for-agent | [`02`](02-the-console-reads-the-pool-behind-the-admin-gate.md) | [`04`](04-the-console-journey-and-the-record.md)               |
| [`04-the-console-journey-and-the-record`](04-the-console-journey-and-the-record.md)                             | ready-for-agent | [`03`](03-the-two-actions-and-the-busy-card.md)                | none                                                           |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
