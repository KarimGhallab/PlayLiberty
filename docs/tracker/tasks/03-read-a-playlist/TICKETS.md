# 03: Read a playlist

Tickets for [`03-read-a-playlist`](../../specs/03-read-a-playlist.md). One file per ticket, numbered in
dependency order, each declaring its blocking edges. This spec is server-only, so every ticket is verifiable
through the API.

| Ticket                                                                          | Status   | Blocked by                                  | Blocks                                         |
| ------------------------------------------------------------------------------- | -------- | ------------------------------------------- | ---------------------------------------------- |
| [`01-read-the-tracks-of-a-playlist`](01-read-the-tracks-of-a-playlist.md)       | resolved | none                                        | [`02`](02-the-boundary-and-the-states-hold.md) |
| [`02-the-boundary-and-the-states-hold`](02-the-boundary-and-the-states-hold.md) | resolved | [`01`](01-read-the-tracks-of-a-playlist.md) | none                                           |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through the route and its tests, demoable on its own.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
