# 06: The critical journeys run on the device

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

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

**Constraints:** The dev client's floating gear covers the account door's centre, so the flows tap its left tenth. A relaunch waits up to 20 seconds for the resolved state. The physical-device pass stays with spec 32.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
