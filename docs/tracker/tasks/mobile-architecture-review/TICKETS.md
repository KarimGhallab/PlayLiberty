# Mobile architecture review

Tickets for the mobile architecture review of 8 November 2026. The set deepens four modules in `apps/mobile/src`: the deferred action, the cover upload, the playback start and the credentialed request. Each ticket stands alone and records its outcome.

The review read the hottest path in the last 100 commits. The candidate that the review did not select is the cover chain across the player surfaces.

| Ticket                                                                                                                  | Status   | Blocked by | Blocks |
| ----------------------------------------------------------------------------------------------------------------------- | -------- | ---------- | ------ |
| [`01-move-the-deferred-action-behind-one-module`](01-move-the-deferred-action-behind-one-module.md)                     | resolved | none       | none   |
| [`02-put-the-cover-upload-behind-one-interface`](02-put-the-cover-upload-behind-one-interface.md)                       | resolved | none       | none   |
| [`03-start-playback-through-one-module`](03-start-playback-through-one-module.md)                                       | resolved | none       | none   |
| [`04-route-every-credentialed-request-through-one-session`](04-route-every-credentialed-request-through-one-session.md) | resolved | none       | none   |

## Conventions

- One file per ticket, numbered from `01` in dependency order. These four have no blocking edges, so their order is the review's order.
- Resolve a ticket by recording the outcome in the ticket and updating its row here. Do not delete it.
