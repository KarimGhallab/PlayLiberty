# 10: One action per egress row, named for what it does

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** none.

## Outcome

The egress page has one action per row. An inactive row's `Switch` applies the
config, checks it, and keeps it; the active row's `Check` checks the loaded
config without switching. Both carry an icon, the switch in the egress purple,
and the reserved width holds the icon plus `Switching...` or `Checking...`.

`probe` is now the `switch` and `check` actions across the agent, client,
server, contract, web hooks and stored timestamp: `/egress/:name/switch`,
`/egress/check`, `EgressCheckFacts`, `switchEgress`, `checkEgress`,
`useSwitchEgress`, `useCheckEgress`, `lastCheckAt` and a `RENAME COLUMN`
migration. The switch runs the check under the hood; the check never switches.
The unverified apply (`applyConfig` and `/apply`) stays for rotation, with no
page control. A refused switch returns 502 `egress_switch_failed` with the
agent's sentence; a socket failure still answers `agentReachable: false`.

In the agent, the `switch` module owns the switch mechanics, the named switch and
the pool membership check; the `check` module only reads the loaded config; the
route composes the two. The apply is the rotation primitive.

The spec, the glossary, the host-verification ticket and the resolved switch
ticket now use the new vocabulary and the one-action page.

Verification: `pnpm run build`, `pnpm run lint:check` and
`npx dependency-cruiser .` (345 modules) pass. Suites: youtube 39, egress-agent
47, server 426, web 598. The page suite records the active `Check`, the inactive
`Switch`, the in-flight label, the refused switch and the unreachable agent; the
migration suite applies the renamed column.

## What to build

The egress page stops offering two similar actions. An inactive row has one
`Switch` control: it applies the config, checks it, and keeps it. The active row
has one `Check` control: it checks the loaded config without switching. Both use
the same operation, and the active marker moves only for the inactive row.

Each control carries an icon. Use `IconArrowsExchange` for `Switch` and
`IconCircleCheck` for `Check`. The `Switch` icon uses the egress purple; the
`Check` icon uses the page's normal ink. The icon and the in-flight label sit
inside the reserved width, so `Switching...` and `Checking...` do not move the
actions column. The icons are decorative, so the accessible names stay `Switch`
and `Check`.

The two actions are named for what they do. `probe` becomes `switch` and
`check` in the agent, the client, the server, the contract, the web hooks and
the stored last-check timestamp. The switch runs the check under the hood; the
unverified apply stays available to rotation, but it has no page control.

A switch the agent refuses carries the agent's fixed sentence as a 502 problem,
not an "agent unreachable" answer. Only a real socket failure says the agent is
unreachable. The check still writes the status, the last check, the exit address
and the reason.

The spec, the glossary, the open host-verification ticket and the resolved
switch ticket are updated to the new vocabulary and the one-action page.

## Acceptance criteria

- [x] An inactive row has one `Switch` control; it applies the config, checks it, and moves the active marker.
- [x] The active row has one `Check` control; it checks without moving the marker.
- [x] Both controls carry an icon; the `Switch` icon uses the egress purple, and the reserved width holds the icon plus the in-flight label.
- [x] Both controls disable while the operation is in flight and read `Switching...` or `Checking...`.
- [x] A refused switch shows the agent's fixed sentence; a socket failure says the agent is unreachable.
- [x] The two actions are `switch` and `check` across the agent, client, server, contract, web hooks and stored timestamp; the unverified apply remains for rotation with no page control.
- [x] The spec's interface decision and tasks, the glossary, the open host-verification ticket and the resolved switch ticket describe the one-action page and the new vocabulary.
- [x] The server, web and agent suites cover the inactive switch, the active check, the refused switch, the unreachable agent and the migration.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
