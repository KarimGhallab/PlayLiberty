# 02: The egress page shows the pool and its state

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

The first slice is live end to end: the host agent, the socket, the server read,
and the page.

`apps/egress-agent` (`@playliberty/egress-agent`) reads `PROTON_POOL_DIR`, takes the file stem
as the name, orders by file name, and parses the peer endpoint, reporting a null
when a config has none instead of dropping it. `PROTON_ACTIVE_CONFIG` names the
loaded config and is validated at boot, so a typo is a start failure rather than a
pool with no active row; absent, the first file is assumed. `--dry-run` prints the
status and exits, which is the runbook's parse check. It opens no interface, holds
no database, and touches nothing under the media root.

The socket gate is kernel-enforced ownership rather than `SO_PEERCRED`: Node
exposes no peer credentials on a Unix socket. The agent chowns the socket to
`EGRESS_AGENT_PEER_UID` (root only; a non-root agent refuses when the owner differs),
sets `0600`, and logs the path. Only that uid, or root, can connect. The
`packages/youtube` client talks `GET /status` over the socket with a 2 s timeout
and validates the answer before it reaches a feature.

The server mirrors the pool into `egress_config` at boot and on every read,
marks the active row from the agent's report, drops rows that have left the pool,
and answers `GET /api/v1/egress`. An unreachable agent is `agentReachable: false`
with the last known pool, never a failed read. The route is admin-only: anyone
else receives the same not-found a missing route gives, and the agent is not
called for them.

The web client gains `/egress`, an admin entry in the library header that does
not exist for other accounts, and the pool table: name, endpoint, status, last
attempt, and which config is active. Every row is `unknown` until something
measures it. The read's 404 draws "This page is not available." rather than a
retry, because a retry cannot change the answer.

One contract correction came with the admin gate: `/me` was declared as
`AccountSummarySchema` while the server returned the full `Account`, so the
client's parse dropped the reader's own role. It is now declared as
`AccountSchema`, which is what the server always sent and what
`toAccountView` documents.

Verification: `pnpm run build`, `pnpm run lint:check`,
`npx dependency-cruiser .` (329 modules, no violations) and
`node scripts/validate-tsconfig-paths.cjs` pass. Unit suites: egress-agent 10, youtube
34, server 399, web 590. The dry-run agent against a two-file fixture pool
returns both configs in name order with the override as active.

## What to build

The first cut through every layer: a host agent that reads the pool of Proton
configs and answers one call, a socket the pod can reach, a server read model,
and an admin page that draws it.

`apps/egress-agent` reads `/etc/playliberty/proton/NN-<slug>.conf` from a directory it
takes from its environment, so a workstation can point it at a fixture pool. It
reports the pool in name order, the config it loaded at start, and since when.
The name is the file stem; the comment lines inside a Proton config are not
parsed. It listens on a Unix socket, and it refuses a peer whose uid is not the
one it is configured to accept. A `--dry-run` mode parses and reports without
touching any interface, so the whole slice is demoable with no tunnel and no
root.

The server mirrors the pool into an `egress_config` table at boot and on read,
marks the active row from the agent's report, and answers an admin read. The web
client gains the admin route: name, endpoint, active, status, last attempt. The
status is `unknown` for every row until something probes or uses an exit, which
is the honest state after this ticket.

## Acceptance criteria

- [x] The agent reads a configurable pool directory, orders configs by name, and reports each name and endpoint without parsing the file's comments.
- [x] `status` answers the pool, the loaded config, and the time it was loaded.
- [x] The socket exists at a configurable path and a connection from a uid other than the configured one is refused.
- [x] The agent holds no database, writes nothing to the media root, and runs without root in `--dry-run`.
- [x] The server reconciles `egress_config` from `status` at boot and on read, and does not fail the read when the agent is unreachable: it reports that instead.
- [x] The admin read answers the pool with its active row, its status and its last attempt; a non-admin gets not-found.
- [x] The `/egress` route draws the pool and is absent from navigation for non-admins; with no admin configured the route does not exist.
- [x] `unknown` is the state of a config that has never been probed or used, and the page does not imply health it has not measured.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
