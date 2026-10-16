# 04: Curate a playlist, on the web

Tickets for the web half of [`04-curate-a-playlist`](../../specs/04-curate-a-playlist.md), which the
[server set](TICKETS.md) deliberately deferred: that set is server-only and left the overflow menu and the
add dialog to the screen work. Nothing picked them up, and the add-a-track capability shipped with a route and
no client. This set closes the one capability `PRODUCT.md` names, "add one pasted video to several
write-accessible playlists at once".

The design is settled first: the dialog, and the control's place and access rule, are all decided. The code
landed with the design, so the set below is the record of what was built rather than a plan to build it.

| Ticket                                                                | Status   | Blocked by                            | Blocks |
| --------------------------------------------------------------------- | -------- | ------------------------------------- | ------ |
| [`08-the-add-a-track-control`](08-the-add-a-track-control.md)         | resolved | none                                  | none   |
| [`09-the-add-a-track-dialog`](09-the-add-a-track-dialog.md)           | resolved | [`08`](08-the-add-a-track-control.md) | none   |
| [`10-the-add-a-track-e2e-journey`](10-the-add-a-track-e2e-journey.md) | resolved | [`09`](09-the-add-a-track-dialog.md)  | none   |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first. The server set already holds
  `01` to `07`; this set continues at `08` so the two read as one spec's tickets.
- Each ticket is a tracer bullet: a complete path through a component, its hook, its contract and its tests.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
