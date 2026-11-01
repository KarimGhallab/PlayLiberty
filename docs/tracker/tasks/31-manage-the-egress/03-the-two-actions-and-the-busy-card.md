# 03: The two actions and the busy card

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-console-reads-the-pool-behind-the-admin-gate.md)

## What to build

The active exit offers Check and every standby offers Switch. Pressing either runs the one action for the pool: the
pressed card is busy with its working word, every other action is disabled, and the answer replaces the pool read.

A success names the exit that answered. A failure says the action did not land and carries the server's detail when
it has one. An unreachable agent is a failure. A refused action leaves the cards as the read reported them. Each
action's accessible name carries the exit it acts on.

## Acceptance criteria

- [ ] The active card offers Check and each standby offers Switch.
- [ ] Only one action can be in flight; the pressed card is busy and the other actions are disabled.
- [ ] A success and a failure each draw a transient notice.
- [ ] An unreachable agent is a failure, not a success.
- [ ] A refused action leaves the card's state as the read reported it.
- [ ] The action's accessible name includes the exit and the action.

## Verification

The mobile console suite passes with the pool read and the two actions mocked,
`pnpm --filter @playliberty/mobile run typecheck` passes, and a device check switches a standby and checks the active
exit.
