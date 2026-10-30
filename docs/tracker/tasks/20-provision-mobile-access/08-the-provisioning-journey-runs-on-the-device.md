# 08: The provisioning journey runs on the device

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

`provisioning.yaml` starts from either state: it signs out through the sheet when the app opened signed in, taps
Sign in, waits for the browser flow to return to the library, then kills and relaunches the app and asserts it is
still signed in. It uses the existing test ids and the account door's point tap.

The `.maestro/README.md` documents the four flows, the prerequisites, the one command, the point tap and the scope.
The initial wait for the resolved state moved from 20 to 30 seconds in every flow, because a cold dev bundle could
outlast the old wait and skip the conditional sign-in.

The flow passed alone from a signed-out start and in the full set from a signed-in start.

## Verification

- `PATH="$HOME/.maestro/bin:$PATH" pnpm --filter @playliberty/mobile run e2e` on `emulator-5554`:
  `4/4 Flows Passed in 2m 15s`.
- The provisioning flow passed alone and in the full set in 37 seconds.

## Notes

- The first run failed with a `502` because the running dev server had loaded an older `.env`; restarting the dev
  server fixed the exchange. The flow was green once the server minted.
- One run hit a native Fabric `SIGSEGV` on launch; the flow and the full set passed on rerun. The crash is in React
  Native's UI manager, not the flow.
- The full set leaves the device signed out because `signed-out` runs last; `provisioning` itself leaves it signed
  in.

See [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md).
