# 06: A refused token ends the session on every request

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md), "a `401` mid-session as the
signed-out state", and user story 10.
**Blocked by:** None. Can start immediately.

## Outcome

The app's query client now gives the mutation cache the same refusal handler as the query cache. A mutation that gets
a `NeedsProvisioningError` calls the refusal handler once, which the shell already wires to `expire` and the cache
clear. An ordinary mutation failure does not call it. The query path is unchanged.

## Verification

- Mobile 71 tests across 15 suites, `tsc --noEmit`, `pnpm run build` and `pnpm run lint:check` pass.
- Two mutation tests cover the refused credential and the ordinary failure; the existing query tests stay green.

## Notes

- The mutation tests set `gcTime: Infinity` so the mutation cache does not leave a five-minute GC timer that keeps
  Jest open.

See [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md).
