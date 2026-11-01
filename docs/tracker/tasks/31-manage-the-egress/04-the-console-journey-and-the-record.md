# 04: The console journey and the record

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-the-two-actions-and-the-busy-card.md)

## What to build

A Maestro flow opens the console from the library header's egress door, switches a named standby, and sees the active
mark move to it. The flow takes the standby's pool name and leaves that exit active.

The README gains the flow's row, its variable, the host prerequisite (a reachable egress agent and a pool with at
least one standby), and the note that a run changes the active exit. The record follows the shipped door: spec `31`'s
solution, its first user story, its door decision and its journey decision place the door in the library header, not
the account sheet; spec `16`'s "web client" sentence names both clients. `DESIGN.md` already records the header door
and stays.

## Acceptance criteria

- [ ] The flow opens the door, switches the named standby, and asserts the active mark on it.
- [ ] The flow passes twice on the emulator with a working agent.
- [ ] The README records the row, the variable, the prerequisite and the active-exit side effect.
- [ ] Spec `31` and spec `16` read as the shipped arrangement.

## Verification

`PATH="$HOME/.maestro/bin:$PATH" maestro test --udid emulator-5554 -e EGRESS_STANDBY=<pool name> apps/mobile/.maestro/egress-switch.yaml`
twice, with the egress agent reachable and the named exit a standby.
