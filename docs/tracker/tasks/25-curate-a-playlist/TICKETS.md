# 25: Curate a playlist on mobile

Tickets for [`25-curate-a-playlist`](../../specs/25-curate-a-playlist.md). One file per ticket, numbered in dependency
order, each declaring its blocking edges.

Spec [`22`](../../specs/22-read-a-playlist.md) already landed the add-track sheet with its checklist, preselection,
first-page note, discard guard, busy state and three outcomes; remove with undo; the deferred delete that returns to
the gallery; retry and fetch whole; the sync band's Retry failed; the skip switch; and the gallery's actions sheet
with pin, sync and delete. This set carries the delta: the consolidated actions sheet on both surfaces, rename, and
the mixed-batch journey. It does not re-open the resolved surfaces.

| Ticket                                                                              | Status          | Blocked by                                       | Blocks                          |
| ----------------------------------------------------------------------------------- | --------------- | ------------------------------------------------ | ------------------------------- |
| [`01-one-actions-sheet-on-both-surfaces`](01-one-actions-sheet-on-both-surfaces.md) | ready-for-agent | none                                             | [`02`](02-rename-a-playlist.md) |
| [`02-rename-a-playlist`](02-rename-a-playlist.md)                                   | ready-for-agent | [`01`](01-one-actions-sheet-on-both-surfaces.md) | none                            |
| [`03-the-mixed-batch-journey`](03-the-mixed-batch-journey.md)                       | ready-for-agent | none                                             | none                            |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through the screen and the behaviour it adds, demoable on its own.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
