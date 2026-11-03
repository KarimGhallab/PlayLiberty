# mobile-ui-audit-2

Tickets for [issue 106](../../issues/106-the-mobile-ui-still-misses-its-contract.md), the second mobile UI audit.
One file per ticket, numbered by severity, each declaring its blocking edges. Every ticket is an issue ticket: it
repairs what already ships.

| Ticket                                                                                                | Status   | Blocked by | Blocks |
| ----------------------------------------------------------------------------------------------------- | -------- | ---------- | ------ |
| [`01-the-track-row-is-one-target`](01-the-track-row-is-one-target.md)                                 | resolved | none       | none   |
| [`02-every-control-meets-androids-48dp-target`](02-every-control-meets-androids-48dp-target.md)       | resolved | none       | none   |
| [`03-the-gallery-rail-reveals-its-selected-chip`](03-the-gallery-rail-reveals-its-selected-chip.md)   | resolved | none       | none   |
| [`04-the-gallery-grid-is-virtualized`](04-the-gallery-grid-is-virtualized.md)                         | resolved | none       | none   |
| [`05-the-player-bar-swipe-uses-the-motion-tokens`](05-the-player-bar-swipe-uses-the-motion-tokens.md) | resolved | none       | none   |
| [`06-the-card-and-the-row-survive-font-scale-2`](06-the-card-and-the-row-survive-font-scale-2.md)     | resolved | none       | none   |
| [`07-the-dial-label-presses-and-reads-once`](07-the-dial-label-presses-and-reads-once.md)             | resolved | none       | none   |
| [`08-the-share-picker-says-close-not-cancel`](08-the-share-picker-says-close-not-cancel.md)           | resolved | none       | none   |
| [`09-the-actions-sheet-draws-one-rule`](09-the-actions-sheet-draws-one-rule.md)                       | resolved | none       | none   |
| [`10-reduce-motion-is-the-default`](10-reduce-motion-is-the-default.md)                               | resolved | none       | none   |
| [`11-decoration-leaves-the-accessibility-tree`](11-decoration-leaves-the-accessibility-tree.md)       | resolved | none       | none   |
| [`12-the-detail-sheet-enters-once`](12-the-detail-sheet-enters-once.md)                               | resolved | none       | none   |

## Conventions

- One file per ticket, numbered by severity; every ticket can start immediately.
- A ticket with no blockers can start immediately.
- `07` merges the two action dial findings, because one structural change fixes both.
- Resolve a ticket by recording the outcome in the ticket and updating its row here. Do not delete it.
