# Mobile architecture review

Tickets for the mobile architecture review of 8 November 2026. The set deepens three modules in `apps/mobile/src`: the deferred action, the cover upload and the playback start. Each ticket stands alone.

The review read the hottest path in the last 100 commits. The candidates that the review did not select are the credentialed request seam and the cover chain across the player surfaces. The decisions stay in `docs/ARCHITECTURE.md`.

| Ticket                                                                                       | Status          | Blocked by | Blocks |
| -------------------------------------------------------------------------------------------- | --------------- | ---------- | ------ |
| [`01-move-the-deferred-action-behind-one-module`](01-move-the-deferred-action-behind-one-module.md) | resolved        | none       | none   |
| [`02-put-the-cover-upload-behind-one-interface`](02-put-the-cover-upload-behind-one-interface.md)   | ready-for-agent | none       | none   |
| [`03-start-playback-through-one-module`](03-start-playback-through-one-module.md)                   | ready-for-agent | none       | none   |

## Conventions

- One file per ticket, numbered from `01` in dependency order. These three have no blocking edges, so their order is the review's order.
- The report behind this set lives outside the repository. Its line numbers are evidence for the first draft, not a specification.
- A ticket is done when its acceptance criteria hold and its verification passes. Record the outcome in the ticket, then update its row here. Do not delete it.
