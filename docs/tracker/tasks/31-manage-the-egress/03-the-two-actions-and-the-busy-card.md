# 03: The two actions and the busy card

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`useEgress.ts` now owns the read and the two commands. Switch sends the exit name and Check sends none; both answer the
whole pool read and write the egress key from that answer, so the page updates in one response.

The active card offers Check and each standby offers Switch. One action runs at a time: the pressed card shows its
working word (`Checking...` or `Switching...`) with its busy state, and every other action is disabled. A success
names the exit that answered; a refused action carries the server's detail and leaves the cards as the read reported
them; an unreachable agent is a failure, not a success. Each action's accessible name is the action and the exit, and
its test id is `egress-action-<name>` for the journey.

See [`31-manage-the-egress`](../../specs/31-manage-the-egress.md).
