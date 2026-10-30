# 06: A refused token ends the session on every request

**Status:** ready-for-agent
**Labels:** `bug`, `ready-for-agent`
**Source:** [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md), "a `401` mid-session as the
signed-out state", and user story 10.
**Blocked by:** None. Can start immediately.

## Observed

The app's query client reports `NeedsProvisioningError` from the query cache only. A mutation that gets a `401`
throws to the screen and the session stays signed in, so the person is left on a screen whose next request will also
be refused.

## Expected

A refused credential from any read or mutation ends the session: the token is cleared, the query cache is cleared
and the signed-out state appears. An ordinary mutation failure does not end the session.

## Evidence

The query client config has a query cache handler and no mutation cache handler. The request client throws the same
refusal for a read and a mutation, so the missing handler is the only difference.

## Acceptance criteria

- [ ] A mutation that gets a `401` calls the refusal handler once.
- [ ] A query that gets a `401` still calls it once.
- [ ] The session store clears the token and the cache clears, as the shell already does.
- [ ] An ordinary mutation failure does not end the session.

## Verification

`pnpm --filter @playliberty/mobile run test`. The query client test runs a real mutation that throws
`NeedsProvisioningError` and asserts the handler ran once; the existing query tests stay green.
