# 06: Prune orphans

Tickets for [`06-prune-orphans`](../../specs/06-prune-orphans.md). One file per ticket, numbered in dependency
order, each declaring its blocking edges. This spec has no client clause at all, so every ticket is verifiable
through the service and the media root.

| Ticket                                                            | Status          | Blocked by                              | Blocks                             |
| ----------------------------------------------------------------- | --------------- | --------------------------------------- | ---------------------------------- |
| [`01-prune-the-orphaned-tracks`](01-prune-the-orphaned-tracks.md) | ready-for-agent | none                                    | [`02`](02-stop-a-prune-cleanly.md) |
| [`02-stop-a-prune-cleanly`](02-stop-a-prune-cleanly.md)           | ready-for-agent | [`01`](01-prune-the-orphaned-tracks.md) | none                               |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through the service, the scheduler and its tests, demoable on its own.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
