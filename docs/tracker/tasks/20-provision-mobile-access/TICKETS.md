# 20: Provision mobile access

Tickets for [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md). The flow is implemented and
recorded in [`07-provision-mobile-access`](../07-provision-mobile-access.md); these tickets close the gaps between
that implementation and the spec's guarantees. They do not rebuild the flow.

| Ticket                                                                                                            | Status          | Blocked by                                            | Blocks                                                         |
| ----------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| [`01-the-provisioning-paths-write-no-account`](01-the-provisioning-paths-write-no-account.md)                     | ready-for-agent | none                                                  | [`03`](03-the-exemption-is-one-method-on-one-path.md)          |
| [`02-the-exchange-counts-the-caller`](02-the-exchange-counts-the-caller.md)                                       | ready-for-agent | none                                                  | [`04`](04-the-exchange-records-its-outcome-without-secrets.md) |
| [`03-the-exemption-is-one-method-on-one-path`](03-the-exemption-is-one-method-on-one-path.md)                     | ready-for-agent | [`01`](01-the-provisioning-paths-write-no-account.md) | none                                                           |
| [`04-the-exchange-records-its-outcome-without-secrets`](04-the-exchange-records-its-outcome-without-secrets.md)   | ready-for-agent | [`02`](02-the-exchange-counts-the-caller.md)          | none                                                           |
| [`05-a-refused-provisioning-offers-sign-in-again`](05-a-refused-provisioning-offers-sign-in-again.md)             | ready-for-agent | none                                                  | none                                                           |
| [`06-a-refused-token-ends-the-session-on-every-request`](06-a-refused-token-ends-the-session-on-every-request.md) | ready-for-agent | none                                                  | none                                                           |
| [`07-the-production-instance-holds-the-pangolin-key`](07-the-production-instance-holds-the-pangolin-key.md)       | ready-for-agent | none                                                  | none                                                           |
| [`08-the-provisioning-journey-runs-on-the-device`](08-the-provisioning-journey-runs-on-the-device.md)             | ready-for-agent | none                                                  | none                                                           |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Ticket `01` settles the identity the provisioning paths use; `03` then narrows the exemption on the same hook.
- Ticket `02` settles the refusal set; `04` then records it.
- The critical journey's "streams a track afterwards" clause cannot run until spec `23`; that clause belongs to `23`.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
