# 08: The provisioning journey runs on the device

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## What to build

One Maestro flow that starts signed out, taps Sign in, completes the browser flow through the dev proxy, reaches the
library, then kills and relaunches the app and asserts it is still signed in. The flow establishes its own state: if
the app starts signed in, it signs out through the sheet first. It uses the existing test ids and the account door's
point tap.

The spec's "streams a track afterwards" clause cannot run until spec [`23`](../../specs/23-play-stored-audio.md);
that clause belongs to `23`, and this flow asserts the library and the session instead.

## Acceptance criteria

- [ ] The flow starts from either a signed-in or a signed-out app and leaves it signed in.
- [ ] It proves the browser returns to the app and the library appears.
- [ ] It proves the token survives a kill and relaunch.
- [ ] It runs with the existing `e2e` command and is documented in the README.
- [ ] The full set passes 4/4.

## Verification

`PATH="$HOME/.maestro/bin:$PATH" pnpm --filter @playliberty/mobile run e2e` on `emulator-5554`, all four flows
green.
