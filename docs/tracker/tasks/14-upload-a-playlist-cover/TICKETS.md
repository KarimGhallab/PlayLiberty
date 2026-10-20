# 14: Upload a playlist cover

Tickets for [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md). One file per ticket,
numbered in dependency order, each declaring its blocking edges. The server tickets are verifiable through the
API; the web tickets through the screen and its tests. One set, `01` to `09`, with the journey last. `01` is the
prefactor and `09` can run alongside any ticket.

| Ticket                                                                                            | Status          | Blocked by                                                                                               | Blocks                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-carry-the-cover-through-the-playlist-read`](01-carry-the-cover-through-the-playlist-read.md) | ready-for-agent | none                                                                                                     | [`02`](02-set-and-read-a-cover-through-the-api.md), [`07`](07-prune-unreferenced-cover-files.md)                                                        |
| [`02-set-and-read-a-cover-through-the-api`](02-set-and-read-a-cover-through-the-api.md)           | ready-for-agent | [`01`](01-carry-the-cover-through-the-playlist-read.md)                                                  | [`03`](03-remove-a-cover-through-the-api.md), [`04`](04-draw-the-custom-cover-and-its-fallback.md), [`05`](05-set-a-cover-from-the-playlist-actions.md) |
| [`03-remove-a-cover-through-the-api`](03-remove-a-cover-through-the-api.md)                       | ready-for-agent | [`02`](02-set-and-read-a-cover-through-the-api.md)                                                       | [`06`](06-remove-a-cover-from-the-dialog.md)                                                                                                            |
| [`04-draw-the-custom-cover-and-its-fallback`](04-draw-the-custom-cover-and-its-fallback.md)       | ready-for-agent | [`02`](02-set-and-read-a-cover-through-the-api.md)                                                       | [`05`](05-set-a-cover-from-the-playlist-actions.md)                                                                                                     |
| [`05-set-a-cover-from-the-playlist-actions`](05-set-a-cover-from-the-playlist-actions.md)         | ready-for-agent | [`02`](02-set-and-read-a-cover-through-the-api.md), [`04`](04-draw-the-custom-cover-and-its-fallback.md) | [`06`](06-remove-a-cover-from-the-dialog.md), [`08`](08-the-cover-journey.md)                                                                           |
| [`06-remove-a-cover-from-the-dialog`](06-remove-a-cover-from-the-dialog.md)                       | ready-for-agent | [`03`](03-remove-a-cover-through-the-api.md), [`05`](05-set-a-cover-from-the-playlist-actions.md)        | [`08`](08-the-cover-journey.md)                                                                                                                         |
| [`07-prune-unreferenced-cover-files`](07-prune-unreferenced-cover-files.md)                       | ready-for-agent | [`01`](01-carry-the-cover-through-the-playlist-read.md)                                                  | none                                                                                                                                                    |
| [`08-the-cover-journey`](08-the-cover-journey.md)                                                 | ready-for-agent | [`05`](05-set-a-cover-from-the-playlist-actions.md), [`06`](06-remove-a-cover-from-the-dialog.md)        | none                                                                                                                                                    |
| [`09-amend-the-cover-documents`](09-amend-the-cover-documents.md)                                 | ready-for-agent | none                                                                                                     | none                                                                                                                                                    |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first. `09` has no blockers and can
  start immediately.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- The server tickets are tracer bullets through the contract, the database, the service and its tests. The web
  tickets are tracer bullets through the screen, its read, its actions and its tests.
- The prefactor in `01` lands before any cover behavior, so the playlist read and every fixture agree before the
  feature starts.
- The documentation ticket `09` may land alongside any ticket; it is not a gate on the code.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
