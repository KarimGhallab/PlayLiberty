# 03: The two actions and the busy card

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-console-reads-the-pool-behind-the-admin-gate.md)

## Outcome

`useEgress.ts` now owns the read and the two commands. Switch sends the exit name and Check sends none; both answer the
whole pool read and write the egress key from that answer, so the page updates in one response.

The active card offers Check and each standby offers Switch. One action runs at a time: the pressed card shows its
working word (`Checking...` or `Switching...`) with its busy state, and every other action is disabled. A success
names the exit that answered; a refused action carries the server's detail and leaves the cards as the read reported
them; an unreachable agent is a failure, not a success. Each action's accessible name is the action and the exit, and
its test id is `egress-action-<name>` for the journey.

## Verification

- Mobile: 471 tests across 51 suites, adding seven console cases for the two actions, both busy states, the success
  notices, the refused switch and the unreachable agent.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- On `emulator-5554` as an admin, the active card showed Check and the standby showed Switch. Both actions reached the
  server, which answered with the agent unreachable, and the screen drew the two failure notices with the agent
  sentence, leaving the active mark on `01-FR-634`. The host has no egress agent, so a successful switch and check were
  not exercised on the device; the success path is covered by the console suite.

See [`31-manage-the-egress`](../../specs/31-manage-the-egress.md).
