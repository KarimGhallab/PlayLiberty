# 05: Share a playlist

Tickets for [`05-share-a-playlist`](../../specs/05-share-a-playlist.md). One file per ticket, numbered in
dependency order, each declaring its blocking edges. This spec is server-only, so every ticket is verifiable
through the API; the share dialog and the library's "shared by" line belong to the screen work and
[`08-see-the-library`](../../specs/08-see-the-library.md).

| Ticket                                                                                | Status          | Blocked by                                                                      | Blocks                            |
| ------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------- | --------------------------------- |
| [`01-list-the-accounts-on-the-instance`](01-list-the-accounts-on-the-instance.md)     | ready-for-agent | none                                                                            | none                              |
| [`02-list-and-grant-shares-on-a-playlist`](02-list-and-grant-shares-on-a-playlist.md) | ready-for-agent | none                                                                            | [`04`](04-what-a-share-grants.md) |
| [`03-revoke-a-share`](03-revoke-a-share.md)                                           | ready-for-agent | none                                                                            | [`04`](04-what-a-share-grants.md) |
| [`04-what-a-share-grants`](04-what-a-share-grants.md)                                 | ready-for-agent | [`02`](02-list-and-grant-shares-on-a-playlist.md), [`03`](03-revoke-a-share.md) | none                              |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through a route, its service, its contract and its tests, demoable on its own.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
