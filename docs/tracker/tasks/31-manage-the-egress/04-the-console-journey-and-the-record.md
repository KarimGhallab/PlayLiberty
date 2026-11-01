# 04: The console journey and the record

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-the-two-actions-and-the-busy-card.md)

## Outcome

`egress-switch.yaml` launches the app, signs in when it must, asserts the admin's header door, opens the console,
scrolls to `EGRESS_STANDBY`'s action, asserts that exit starts as a standby, taps it, waits for its active mark, and
backs out to the library.

The README gains the flow's row, the `EGRESS_STANDBY` variable, an egress fixture section with the admin account and
reachable agent prerequisite, the note that a run leaves the named exit active, and the updated scope. A second run
takes the exit that is now a standby, which switches back.

The record now follows the shipped door. Spec `31`'s solution, first user story, door decision and journey decision
place the door in the library header; spec `16`'s web-only sentence names both clients. `DESIGN.md` already recorded
the header door and is unchanged.

## Verification

- Two passes on `emulator-5554`: `EGRESS_STANDBY=02-FR-182` then `EGRESS_STANDBY=01-FR-634`. Each run reached the
  console, found the named standby, switched it, saw the active mark move, and returned to the library.
- The host has no WireGuard agent, so the passes used a temporary protocol stand-in on the server's configured egress
  socket. The stand-in, the socket, the temporary admin entry and the written egress rows were removed afterward; the
  server is back on `dev-user` only and the pool's original active row is restored.
- The real host agent still needs to run the same command on the deployment; the mobile flow and its record are
  complete without it.

See [`31-manage-the-egress`](../../specs/31-manage-the-egress.md).
