# 29: Set a playlist cover on mobile

Tickets for [`29-set-a-playlist-cover`](../../specs/29-set-a-playlist-cover.md). One file per ticket, numbered in
dependency order, each declaring its blocking edges.

The server already owns the cover route, the crop query fields and the normalisation, and the cover chain and the
`coverDialog` copy already ship. This set adds the mobile surface: one shared owner for the crop maths, the sheet
with its picker and its two commands, the crop stage, and the journey.

| Ticket                                                                                  | Status          | Blocked by                                                                                         | Blocks                                        |
| --------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [`01-one-owner-for-the-crop-fractions`](01-one-owner-for-the-crop-fractions.md)         | resolved        | none                                                                                               | [`03`](03-the-crop-stage-frames-the-cover.md) |
| [`02-the-cover-sheet-saves-a-chosen-image`](02-the-cover-sheet-saves-a-chosen-image.md) | resolved        | none (the human installs the picker and rebuilds)                                                  | [`03`](03-the-crop-stage-frames-the-cover.md) |
| [`03-the-crop-stage-frames-the-cover`](03-the-crop-stage-frames-the-cover.md)           | ready-for-agent | [`01`](01-one-owner-for-the-crop-fractions.md), [`02`](02-the-cover-sheet-saves-a-chosen-image.md) | [`04`](04-the-cover-journey.md)               |
| [`04-the-cover-journey`](04-the-cover-journey.md)                                       | ready-for-agent | [`03`](03-the-crop-stage-frames-the-cover.md)                                                      | none                                          |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
