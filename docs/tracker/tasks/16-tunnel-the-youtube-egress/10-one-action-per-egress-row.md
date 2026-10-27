# 10: One action per egress row, named for what it does

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The egress page has one action per row. An inactive row's `Switch` applies the
config, checks it, and keeps it; the active row's `Check` checks the loaded
config without switching. Both carry an icon, the switch in the egress purple,
and the reserved width holds the icon plus `Switching...` or `Checking...`.

`probe` became `switch` and `check` across the agent, client, server, contract,
web hooks and stored timestamp: `/egress/:name/switch`, `/egress/check`,
`EgressCheckFacts`, `switchEgress`, `checkEgress`, `useSwitchEgress`,
`useCheckEgress`, `lastCheckAt` and a `RENAME COLUMN` migration. The switch runs
the check under the hood; the check never switches. The unverified apply
(`applyConfig` and `/apply`) stays for rotation, with no page control. A refused
switch returns 502 `egress_switch_failed` with the agent's sentence; a socket
failure still answers `agentReachable: false`.

In the agent, the `switch` module owns the switch mechanics, the named switch and
the pool membership check; the `check` module only reads the loaded config; the
route composes the two. The apply is the rotation primitive.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
