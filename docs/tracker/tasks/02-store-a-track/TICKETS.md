# 02: Store a track

Tickets for [`02-store-a-track`](../../specs/02-store-a-track.md). One file per ticket, numbered in dependency
order, each declaring its blocking edges. Every ticket is verifiable through the API and the media store.

| Ticket                                                                        | Status   | Blocked by                               | Blocks                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------- | -------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-download-and-store-a-track`](01-download-and-store-a-track.md)           | resolved | none                                     | [`02`](02-retry-a-failed-download.md), [`03`](03-treat-a-gone-video-as-terminal.md), [`04`](04-fetch-track-artwork.md), [`05`](05-limit-download-concurrency.md), [`06`](06-recover-an-interrupted-download.md) |
| [`02-retry-a-failed-download`](02-retry-a-failed-download.md)                 | resolved | [`01`](01-download-and-store-a-track.md) | none                                                                                                                                                                                                            |
| [`03-treat-a-gone-video-as-terminal`](03-treat-a-gone-video-as-terminal.md)   | resolved | [`01`](01-download-and-store-a-track.md) | none                                                                                                                                                                                                            |
| [`04-fetch-track-artwork`](04-fetch-track-artwork.md)                         | resolved | [`01`](01-download-and-store-a-track.md) | none                                                                                                                                                                                                            |
| [`05-limit-download-concurrency`](05-limit-download-concurrency.md)           | resolved | [`01`](01-download-and-store-a-track.md) | none                                                                                                                                                                                                            |
| [`06-recover-an-interrupted-download`](06-recover-an-interrupted-download.md) | resolved | [`01`](01-download-and-store-a-track.md) | none                                                                                                                                                                                                            |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through the worker, the store and its tests, demoable on its own.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
