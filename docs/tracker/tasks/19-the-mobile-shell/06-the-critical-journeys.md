# 06: The critical journeys run on the device

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-sheet-names-you.md), [`02`](02-sign-out-and-language.md),
[`04`](04-the-screens-stay-current.md), [`05`](05-operable-without-sight.md)

## Outcome

Three Maestro flows live beside the app, one per journey the shell draws:

- `library-and-account`: the app opens on the library, the account sheet opens, and it closes.
- `signed-out`: signing out leaves one action and nothing else.
- `language`: French is chosen, the app is killed and relaunched, and the interface is still French.

They run with one command, `pnpm --filter @playliberty/mobile run e2e`, which runs `maestro test .maestro` from the
app's folder. A `.maestro/README.md` records the prerequisites: Metro, the server, the Vite proxy, and a Maestro CLI
on the PATH.

Each flow stops and relaunches the app, waits for the shell to resolve, and signs in through the dev proxy when it
finds the signed-out state, so the run order does not matter. That was proven twice: once starting signed in, once
starting signed out, both green.

Selectors are `testID`s, not copy, so a flow does not break when the language changes: `account-door`,
`account-sheet`, `account-sign-out`, `account-close`, `account-egress`, `language-en`, `language-fr` and `sign-in`.
The language flow restores English at the end, and the signed-out flow leaves the device signed out on purpose.

## Verification

- Three runs of the whole set, all `3/3` green, between 53 seconds and 1 minute 11.
- One run started from a signed-in device and one from a signed-out device, which is the order independence the
  ticket asked for.
- Mobile 63 tests across 14 suites, `tsc --noEmit` and `pnpm run lint:check` pass.
- The one command was run as written, not only the CLI directly.

## Notes

- The dev client draws a floating gear whose touch area covers the centre of the account door, so a centre tap
  opens the dev menu instead. The flows tap the left tenth of the door, and the README says why.
- After a relaunch the bundle takes several seconds to render. The flows wait up to 20 seconds for the resolved
  state before deciding whether to sign in; without that wait a signed-out start could race the conditional and fail
  on the next step.
- The physical-device pass is not claimed here. It stays with spec `32`, whose checklist already requires the run on
  the phone that will use the app.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
