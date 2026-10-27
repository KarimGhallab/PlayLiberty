# 02: The egress page shows the pool and its state

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`apps/egress-agent` (`@playliberty/egress-agent`) reads `PROTON_POOL_DIR`, takes
the file stem as the name, orders by file name, and parses the peer endpoint,
reporting a null when a config has none instead of dropping it.
`PROTON_ACTIVE_CONFIG` names the loaded config and is validated at boot, so a typo
is a start failure rather than a pool with no active row; absent, the first file
is assumed. `--dry-run` prints the status and exits. The agent opens no
interface, holds no database and touches nothing under the media root.

The socket gate is kernel-enforced ownership rather than `SO_PEERCRED`: Node
exposes no peer credentials on a Unix socket. The agent chowns the socket to
`EGRESS_AGENT_PEER_UID` (root only; a non-root agent refuses when the owner
differs) and sets `0600`, so only that uid, or root, can connect. The
`packages/youtube` client talks `GET /status` over the socket with a 2 s timeout
and validates the answer before it reaches a feature.

The server mirrors the pool into `egress_config` at boot and on every read, marks
the active row from the agent's report, drops rows that have left the pool, and
answers `GET /api/v1/egress`. An unreachable agent is `agentReachable: false`
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
`AccountSchema`.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
