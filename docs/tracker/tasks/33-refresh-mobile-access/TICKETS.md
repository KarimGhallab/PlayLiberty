# 33: Refresh mobile access

Tickets for [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md). The set replaces the app's single
180-day token with a short access token and a rotating refresh family, and makes sign-out revoke at the edge.

| Ticket                                                                                                                            | Status          | Blocked by                                                                                                                | Blocks                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [`01-the-exchange-issues-the-pair-and-the-app-holds-one-record`](01-the-exchange-issues-the-pair-and-the-app-holds-one-record.md) | resolved        | none                                                                                                                      | [`02`](02-the-refresh-route-rotates-the-pair.md), [`04`](04-the-app-refreshes-before-the-access-token-lapses.md)           |
| [`02-the-refresh-route-rotates-the-pair`](02-the-refresh-route-rotates-the-pair.md)                                               | resolved        | [`01`](01-the-exchange-issues-the-pair-and-the-app-holds-one-record.md)                                                   | [`03`](03-reuse-cuts-the-family-off.md), [`04`](04-the-app-refreshes-before-the-access-token-lapses.md)                    |
| [`03-reuse-cuts-the-family-off`](03-reuse-cuts-the-family-off.md)                                                                 | resolved        | [`02`](02-the-refresh-route-rotates-the-pair.md)                                                                          | [`06`](06-sign-out-revokes-the-family-at-the-edge.md), [`07`](07-expired-credentials-are-pruned-and-the-key-can-delete.md) |
| [`04-the-app-refreshes-before-the-access-token-lapses`](04-the-app-refreshes-before-the-access-token-lapses.md)                   | ready-for-agent | [`01`](01-the-exchange-issues-the-pair-and-the-app-holds-one-record.md), [`02`](02-the-refresh-route-rotates-the-pair.md) | [`05`](05-a-refused-request-retries-once-before-signing-out.md), [`06`](06-sign-out-revokes-the-family-at-the-edge.md)     |
| [`05-a-refused-request-retries-once-before-signing-out`](05-a-refused-request-retries-once-before-signing-out.md)                 | ready-for-agent | [`04`](04-the-app-refreshes-before-the-access-token-lapses.md)                                                            | none                                                                                                                       |
| [`06-sign-out-revokes-the-family-at-the-edge`](06-sign-out-revokes-the-family-at-the-edge.md)                                     | ready-for-agent | [`03`](03-reuse-cuts-the-family-off.md), [`04`](04-the-app-refreshes-before-the-access-token-lapses.md)                   | none                                                                                                                       |
| [`07-expired-credentials-are-pruned-and-the-key-can-delete`](07-expired-credentials-are-pruned-and-the-key-can-delete.md)         | ready-for-agent | [`03`](03-reuse-cuts-the-family-off.md)                                                                                   | [`08`](08-the-record-follows-the-refresh-model.md)                                                                         |
| [`08-the-record-follows-the-refresh-model`](08-the-record-follows-the-refresh-model.md)                                           | ready-for-agent | [`07`](07-expired-credentials-are-pruned-and-the-key-can-delete.md)                                                       | none                                                                                                                       |

## Conventions

- One file per ticket, numbered in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Ticket `01` changes the exchange and the app's record together, because a server-only change would leave the app
  unable to sign in.
- Ticket `02` carries the edge bypass, the origin location and the development proxy, because the app cannot reach the
  route otherwise.
- No new journey is added: the refresh is invisible, and the provisioning flow is reused to prove the pair and the
  persisted record.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
