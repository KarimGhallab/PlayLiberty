# Tasks

Actionable tickets with blocking edges, written by `/to-tickets`. One file per ticket, named `NN-slug.md` and numbered in creation order.

## Tickets

| Ticket                                                                  | State    | Blocked by                                 | Blocks                                                    |
| ----------------------------------------------------------------------- | -------- | ------------------------------------------ | --------------------------------------------------------- |
| [`01-define-server-stack`](01-define-server-stack.md)                   | resolved | none                                       | none                                                      |
| [`02-define-web-stack`](02-define-web-stack.md)                         | resolved | none                                       | none                                                      |
| [`03-define-mobile-stack`](03-define-mobile-stack.md)                   | resolved | none                                       | none                                                      |
| [`04-scaffold-server`](04-scaffold-server.md)                           | resolved | none                                       | none                                                      |
| [`05-scaffold-web`](05-scaffold-web.md)                                 | resolved | none                                       | none                                                      |
| [`06-scaffold-mobile`](06-scaffold-mobile.md)                           | open     | none                                       | [`07`](07-provision-mobile-access.md)                     |
| [`07-provision-mobile-access`](07-provision-mobile-access.md)           | open     | [`06`](06-scaffold-mobile.md)              | none                                                      |
| [`08-define-design-system`](08-define-design-system.md)                 | resolved | none                                       | [`09`](09-design-scheme-and-components.md)                |
| [`09-design-scheme-and-components`](09-design-scheme-and-components.md) | resolved | none                                       | [`10`](10-build-design-foundation.md)                     |
| [`10-build-design-foundation`](10-build-design-foundation.md)           | resolved | [`09`](09-design-scheme-and-components.md) | [`05`](05-scaffold-web.md), [`06`](06-scaffold-mobile.md) |
| [`11-form-controls`](11-form-controls.md)                               | resolved | none                                       | none                                                      |
| [`12-rename-refresh-route-to-sync`](12-rename-refresh-route-to-sync.md) | resolved | none                                       | none                                                      |
| [`13-settle-the-screen-inventory`](13-settle-the-screen-inventory.md)   | resolved | none                                       | none                                                      |
| [`14-expose-the-last-sync-run`](14-expose-the-last-sync-run.md)         | resolved | none                                       | none                                                      |
| [`15-add-track-count-to-playlists`](15-add-track-count-to-playlists.md) | resolved | none                                       | none                                                      |
| [`16-design-the-library`](16-design-the-library.md)                     | resolved | none                                       | none                                                      |
| [`17-design-the-playlist-detail`](17-design-the-playlist-detail.md)     | resolved | none                                       | none                                                      |
| [`18-expose-playlist-access`](18-expose-playlist-access.md)             | resolved | none                                       | none                                                      |

Feature-scoped ticket sets live in a folder named for their spec: [`01-sync-a-playlist/TICKETS.md`](01-sync-a-playlist/TICKETS.md), [`02-store-a-track/TICKETS.md`](02-store-a-track/TICKETS.md), [`03-read-a-playlist/TICKETS.md`](03-read-a-playlist/TICKETS.md) and [`04-curate-a-playlist/TICKETS.md`](04-curate-a-playlist/TICKETS.md).

## Conventions

- One file per ticket, named `NN-slug.md`, numbered in creation order.
- The table above links every ticket reference to its file, so a reader lands on the ticket from any row.
- Each ticket declares its blocking edges: which tickets must land before it can start. A ticket with no edges can start immediately.
- Each ticket is a tracer bullet: it reaches a working end state on its own, however thin, rather than being a layer of a larger change.
- A ticket ends with its verification: the command or check that proves it is done.
- Resolve a ticket by recording the outcome in the ticket, then updating its row here. Do not delete it.
