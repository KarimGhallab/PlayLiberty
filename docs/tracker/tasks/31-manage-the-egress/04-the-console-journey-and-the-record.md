# 04: The console journey and the record

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`egress-switch.yaml` launches the app, signs in when it must, asserts the admin's header door, opens the console,
scrolls to `EGRESS_STANDBY`'s action, asserts that exit starts as a standby, taps it, waits for its active mark, and
backs out to the library.

The README gains the flow's row, the `EGRESS_STANDBY` variable, an egress fixture section with the admin account and
reachable agent prerequisite, the note that a run leaves the named exit active, and the updated scope. A second run
takes the exit that is now a standby, which switches back.

The record now follows the shipped door. Spec `31`'s solution and its door and journey decisions
place the door in the library header; spec `16`'s web-only sentence names both clients. `DESIGN.md` already recorded
the header door and is unchanged.

See [`31-manage-the-egress`](../../specs/31-manage-the-egress.md).
