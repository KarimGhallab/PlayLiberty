# 08: The provisioning journey runs on the device

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`provisioning.yaml` starts from either state: it signs out through the sheet when the app opened signed in, taps
Sign in, waits for the browser flow to return to the library, then kills and relaunches the app and asserts it is
still signed in. It uses the existing test ids and the account door's point tap.

The `.maestro/README.md` documents the four flows, the prerequisites, the one command, the point tap and the scope.
The initial wait for the resolved state moved from 20 to 30 seconds in every flow, because a cold dev bundle could
outlast the old wait and skip the conditional sign-in.

The flow passed alone from a signed-out start and in the full set from a signed-in start.

**Constraints:** The full journey set leaves the device signed out because `signed-out` runs last.

See [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md).
