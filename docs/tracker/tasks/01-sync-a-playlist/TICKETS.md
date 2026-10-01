# 01: Sync a playlist

Tickets for [`01-sync-a-playlist`](../../specs/01-sync-a-playlist.md). One file per ticket, numbered in
dependency order, each declaring its blocking edges. This spec is server-only, so every ticket is verifiable
through the API.

| Ticket                                      | Status          | Blocked by                                  | Blocks                                                                                                          |
| ------------------------------------------- | --------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [`01`](01-create-a-synced-playlist.md)      | resolved        | none                                        | [`02`](02-resync-without-duplicating.md), [`06`](06-paste-a-single-video.md)                                    |
| [`02`](02-resync-without-duplicating.md)    | resolved        | [`01`](01-create-a-synced-playlist.md)      | [`03`](03-retain-a-remote-removed-track.md), [`04`](04-honour-a-suppression.md), [`07`](07-authorize-a-sync.md) |
| [`03`](03-retain-a-remote-removed-track.md) | resolved        | [`02`](02-resync-without-duplicating.md)    | [`05`](05-a-failed-sync-changes-nothing.md)                                                                     |
| [`04`](04-honour-a-suppression.md)          | resolved        | [`02`](02-resync-without-duplicating.md)    | none                                                                                                            |
| [`05`](05-a-failed-sync-changes-nothing.md) | resolved        | [`03`](03-retain-a-remote-removed-track.md) | none                                                                                                            |
| [`06`](06-paste-a-single-video.md)          | ready-for-agent | [`01`](01-create-a-synced-playlist.md)      | none                                                                                                            |
| [`07`](07-authorize-a-sync.md)              | ready-for-agent | [`02`](02-resync-without-duplicating.md)    | none                                                                                                            |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through the API and its tests, demoable on its own.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
