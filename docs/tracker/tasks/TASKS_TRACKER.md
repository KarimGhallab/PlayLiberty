# Tasks

Actionable tickets with blocking edges, written by `/to-tickets`. One file per ticket, named `NN-slug.md` and numbered in creation order.

## Tickets

| Ticket                       | State    | Blocked by | Blocks |
| ---------------------------- | -------- | ---------- | ------ |
| `01-define-server-stack`     | resolved | none       | none   |
| `02-define-web-stack`        | resolved | none       | none   |
| `03-define-mobile-stack`     | resolved | none       | none   |
| `04-scaffold-server`         | open     | none       | none   |
| `05-scaffold-web`            | open     | none       | none   |
| `06-scaffold-mobile`         | open     | none       | none   |
| `07-provision-mobile-access` | open     | `04`, `06` | none   |

## Conventions

- Each ticket declares its blocking edges: which tickets must land before it can start. A ticket with no edges can start immediately.
- Each ticket is a tracer bullet: it reaches a working end state on its own, however thin, rather than being a layer of a larger change.
- A ticket ends with its verification: the command or check that proves it is done.
- Resolve a ticket by recording the outcome in the ticket, then updating its row here. Do not delete it.
