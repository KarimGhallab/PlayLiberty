# 19: The mobile shell

Tickets for [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md). One file per ticket, numbered in
dependency order, each declaring its blocking edges. The routes, the signed-out state, the sheet's frame, the
language resolution, the token store and the request client already exist from tickets `06` and `07`, so these
tickets carry only what the shell still owes: the account read, the handover, the live connection and the
accessibility baseline, plus one hardening ticket on the key module that the live connection consumes.

| Ticket                                                                                | Status   | Blocked by                                                             | Blocks                                                                    |
| ------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [`01-the-sheet-names-you`](01-the-sheet-names-you.md)                                 | resolved | none                                                                   | [`02`](02-sign-out-and-language.md), [`05`](05-operable-without-sight.md) |
| [`02-sign-out-and-language`](02-sign-out-and-language.md)                             | resolved | [`01`](01-the-sheet-names-you.md)                                      | [`05`](05-operable-without-sight.md), [`06`](06-the-critical-journeys.md) |
| [`03-one-owner-for-the-invalidation-map`](03-one-owner-for-the-invalidation-map.md)   | resolved | none                                                                   | [`04`](04-the-screens-stay-current.md)                                    |
| [`04-the-screens-stay-current`](04-the-screens-stay-current.md)                       | resolved | [`03`](03-one-owner-for-the-invalidation-map.md)                       | [`06`](06-the-critical-journeys.md)                                       |
| [`05-operable-without-sight`](05-operable-without-sight.md)                           | resolved | [`01`](01-the-sheet-names-you.md), [`02`](02-sign-out-and-language.md) | [`06`](06-the-critical-journeys.md)                                       |
| [`06-the-critical-journeys`](06-the-critical-journeys.md)                             | resolved | `01`, `02`, `04`, `05`                                                 | none                                                                      |
| [`07-a-constant-key-cannot-be-mis-called`](07-a-constant-key-cannot-be-mis-called.md) | resolved | [`03`](03-one-owner-for-the-invalidation-map.md)                       | none                                                                      |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through the app and the reads it makes, demoable on its own.
- Ticket `03` is a prefactor: it moves the invalidation map into `@playliberty/query` so the two clients cannot own
  the same keys twice. It lands before `04`, which is its only consumer.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
