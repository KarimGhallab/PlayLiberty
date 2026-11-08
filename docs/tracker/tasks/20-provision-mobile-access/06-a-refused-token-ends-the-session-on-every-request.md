# 06: A refused token ends the session on every request

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md), "a `401` mid-session as the
signed-out state".

## Outcome

The app's query client now gives the mutation cache the same refusal handler as the query cache. A mutation that gets
a `NeedsProvisioningError` calls the refusal handler once, which the shell already wires to `expire` and the cache
clear. An ordinary mutation failure does not call it. The query path is unchanged.

See [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md).
