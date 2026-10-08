# 09: Keep the screens current

Tickets for [`09-keep-the-screens-current`](../../specs/09-keep-the-screens-current.md), on the
[Server-Sent Events transport](../../../ARCHITECTURE.md#live-updates-use-server-sent-events) that replaces the
spec's original polling. One file per ticket, numbered in dependency order, each declaring its blocking edges.
Ticket 01 lands the whole transport as a tracer bullet (bus, stream, edge configuration, client subscription,
and the first producer and consumer); 02 to 04 add producers to the same bus and stream; 05 is the client's
connection and session resilience. The read states, the local mutation invalidation and the re-authentication
guard already exist and are tested where they exist, so this set builds the stream and pins the gaps the spec
names.

| Ticket                                                                                                  | Status   | Blocked by                                                                                                       | Blocks                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-the-stream-and-a-playlists-sync-progress`](01-the-stream-and-a-playlists-sync-progress.md)         | resolved | none                                                                                                             | [`02`](02-a-tracks-download-state-reaches-the-detail.md), [`03`](03-a-mutation-reaches-the-other-screen.md), [`05`](05-the-stream-reconnects-and-survives-a-session.md) |
| [`02-a-tracks-download-state-reaches-the-detail`](02-a-tracks-download-state-reaches-the-detail.md)     | resolved | [`01`](01-the-stream-and-a-playlists-sync-progress.md)                                                           | [`03`](03-a-mutation-reaches-the-other-screen.md)                                                                                                                       |
| [`03-a-mutation-reaches-the-other-screen`](03-a-mutation-reaches-the-other-screen.md)                   | resolved | [`01`](01-the-stream-and-a-playlists-sync-progress.md), [`02`](02-a-tracks-download-state-reaches-the-detail.md) | [`04`](04-a-share-changes-both-libraries.md)                                                                                                                            |
| [`04-a-share-changes-both-libraries`](04-a-share-changes-both-libraries.md)                             | resolved | [`01`](01-the-stream-and-a-playlists-sync-progress.md), [`03`](03-a-mutation-reaches-the-other-screen.md)        | none                                                                                                                                                                    |
| [`05-the-stream-reconnects-and-survives-a-session`](05-the-stream-reconnects-and-survives-a-session.md) | resolved | [`01`](01-the-stream-and-a-playlists-sync-progress.md)                                                           | none                                                                                                                                                                    |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through the server, the transport and the screen, demoable on
  its own. Ticket 01 is the largest because it lands the transport every later ticket rides on.
- An event is an invalidation hint and never data: the client refetches, so TanStack Query stays the single
  owner of server state and no server value is copied into a store.
- The real wire is covered end to end, because MSW cannot fake an `EventSource`; the unit seam is an injected
  `EventSource` port.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
