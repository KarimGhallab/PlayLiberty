# 34: Cancel a sync

Tickets for [`34-cancel-a-sync`](../../specs/34-cancel-a-sync.md). The set adds a boot recovery for interrupted syncs and a cancel control for a running sync, first on web and then on mobile.

| Ticket                                                                                                  | Status | Blocked by                                              | Blocks                                                     |
| ------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------- | ---------------------------------------------------------- |
| [`01-recover-interrupted-syncs-at-boot`](01-recover-interrupted-syncs-at-boot.md)                       | ready  | none                                                    | none                                                       |
| [`02-cancel-a-running-sync-from-the-web-detail`](02-cancel-a-running-sync-from-the-web-detail.md)       | ready  | none                                                    | [`03`](03-cancel-a-running-sync-from-the-mobile-detail.md) |
| [`03-cancel-a-running-sync-from-the-mobile-detail`](03-cancel-a-running-sync-from-the-mobile-detail.md) | ready  | [`02`](02-cancel-a-running-sync-from-the-web-detail.md) | none                                                       |

## Conventions

- Ticket 01 and ticket 02 can start in parallel. Ticket 01 repairs the state left by a stopped process without any contract or UI change; ticket 02 adds the live cancel command and the web control.
- Ticket 02 carries the cancelled run contract, the server command and guards, the shared client mutation, the web control, and the neutral cancelled presentation for both run bands. The last part keeps the mobile client from reporting a cancelled run as a last sync before ticket 03 lands.
- Ticket 03 is blocked by ticket 02 because it needs the endpoint, the contract, the shared mutation and the cancelled presentation.
- The boot recovery and the cancel are proven at the server app-over-SQLite seam; the web and mobile halves are proven at their playlist-detail screen seams. No end-to-end journey is added.
- No prefactor ticket is needed: the terminal writes are few, and the status guards are part of ticket 02.
- Resolve a ticket by recording the outcome in the ticket and updating its row here. Do not delete it.
