# 07: An operator can switch an exit by hand

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [06](06-five-failures-rotate-the-exit.md).

## Outcome

`POST /egress/:name/switch` is the admin override. It calls the agent's existing
switch with `EGRESS_DRAIN_TIMEOUT_MS`, applies the returned status, and answers
the whole pool. Switching to a config marked `failed` returns it to `unknown`,
clears its counter and drops its last error: the operator's choice is newer than
the stored verdict. A config that was already `ok` keeps that state.

A refused switch writes nothing. The agent's fixed sentence travels as a 502
`egress_switch_failed` problem, an unknown name is the same 404 a non-admin gets,
and an unreachable agent answers `agentReachable: false` with the unchanged pool.
The active row is never moved optimistically.

The page adds a `Switch` control beside `Test`. The active row's control is
disabled, every switch control is disabled while one is in flight, and the
pressed one reads `Switching...`. The control reserves its own wider label, so
the column does not move; the probe's reservation is untouched. A refusal shows
the agent's sentence in a notice, and the pool only changes when the mutation
succeeds.

Verification: `pnpm run build`, `pnpm run lint:check` and
`npx dependency-cruiser .` pass. Suites: server 428, web 598. The recorded switch
is `egressRoutes.test.ts`'s `returns a failed config to unknown with a clean
counter`: the row is seeded failed with five failures and a `blocked` error, the
route switches to it, and the answer is `unknown`, no error, counter zero, with
the active marker moved.

## What to build

The override. The switch mechanism already exists for rotation; this ticket gives
it a surface. An admin picks a config, the agent performs the same bounded drain
and `wg syncconf`, and the page shows the active marker move.

Switching to a config marked `failed` is a statement that the stored failure is
stale: the row returns to `unknown` and its counter to zero, because the
operator's choice is newer information than the stored verdict.

## Acceptance criteria

- [x] The admin route switches the pool to the named config and answers the updated pool.
- [x] The active row's switch control is disabled; any other row's is available.
- [x] The control is in-flight while switching, cannot be pressed twice, and a failure leaves the active row unchanged rather than optimistic.
- [x] Switching to a failed config resets it to `unknown` and clears its counter.
- [x] A switch the agent refuses, because the name is unknown or the interface is down, leaves the active row unchanged and says so.
- [x] Only an admin can switch; a non-admin gets not-found; the mutation carries the client header and passes the origin checks.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
