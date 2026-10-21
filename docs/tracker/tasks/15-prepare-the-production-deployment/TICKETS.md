# 15: Prepare the production deployment

Tickets for [`15-prepare-the-production-deployment`](../../specs/15-prepare-the-production-deployment.md). One file per
ticket, numbered in dependency order, each declaring its blocking edges. `01` is the one-time deployment audit and
must land before `02`, because the script hardcodes the manifest's secret names, keys and paths.

The script prepares only. Installing the Quadlet units, removing the pod and starting the service stay with the
operator.

| Ticket                                                                                      | Status   | Blocked by                                   | Blocks                                               |
| ------------------------------------------------------------------------------------------- | -------- | -------------------------------------------- | ---------------------------------------------------- |
| [`01-audit-the-deployment-artifacts`](01-audit-the-deployment-artifacts.md)                 | resolved | none                                         | [`02`](02-build-the-production-deployment-script.md) |
| [`02-build-the-production-deployment-script`](02-build-the-production-deployment-script.md) | resolved | [`01`](01-audit-the-deployment-artifacts.md) | none                                                 |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- `01` is a one-time repository audit and fix, not a runtime check.
- `02` depends on `01` because it encodes the final secret names, keys and paths.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
