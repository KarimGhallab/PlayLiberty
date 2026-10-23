# 17: Crop a playlist cover on upload

Tickets for [`17-crop-a-playlist-cover`](../../specs/17-crop-a-playlist-cover.md). One file per ticket,
numbered in dependency order, each declaring its blocking edges. `01` is the server slice and is demoable
through today's dialog, which immediately starts storing square covers. `02` adds the crop stage, `03`
proves the full journey, and `04` can run alongside any ticket.

| Ticket                                                                                              | Status | Blocked by                                               | Blocks                                      |
| --------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------- | ------------------------------------------- |
| [`01-store-every-new-cover-as-a-centered-square`](01-store-every-new-cover-as-a-centered-square.md) | open   | none                                                     | [`02`](02-pan-and-zoom-the-chosen-cover.md) |
| [`02-pan-and-zoom-the-chosen-cover`](02-pan-and-zoom-the-chosen-cover.md)                           | open   | [`01`](01-store-every-new-cover-as-a-centered-square.md) | [`03`](03-prove-the-crop-journey.md)        |
| [`03-prove-the-crop-journey`](03-prove-the-crop-journey.md)                                         | open   | [`02`](02-pan-and-zoom-the-chosen-cover.md)              | none                                        |
| [`04-amend-the-cover-documents`](04-amend-the-cover-documents.md)                                   | open   | none                                                     | none                                        |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- `01` is a tracer bullet through the contract, the route, the service and the image pipeline; it is
  verifiable through the API and through the current dialog, which stores its first square covers.
- `02` is a tracer bullet through the crop math, the dialog, the upload query and their tests.
- `03` is the only journey ticket; the server tests own the stored region and the web tests own the
  fractions, so the journey proves the path rather than repeating them.
- `04` records the shipped behavior and can land alongside any code ticket.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
