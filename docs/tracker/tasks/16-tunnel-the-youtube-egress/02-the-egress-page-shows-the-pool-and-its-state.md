# 02: The egress page shows the pool and its state

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## What to build

The first cut through every layer: a host agent that reads the pool of Proton
configs and answers one call, a socket the pod can reach, a server read model,
and an admin page that draws it.

`apps/ingest` reads `/etc/playliberty/proton/NN-<slug>.conf` from a directory it
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

- [ ] The agent reads a configurable pool directory, orders configs by name, and reports each name and endpoint without parsing the file's comments.
- [ ] `status` answers the pool, the loaded config, and the time it was loaded.
- [ ] The socket exists at a configurable path and a connection from a uid other than the configured one is refused.
- [ ] The agent holds no database, writes nothing to the media root, and runs without root in `--dry-run`.
- [ ] The server reconciles `egress_config` from `status` at boot and on read, and does not fail the read when the agent is unreachable: it reports that instead.
- [ ] The admin read answers the pool with its active row, its status and its last attempt; a non-admin gets not-found.
- [ ] The `/egress` route draws the pool and is absent from navigation for non-admins; with no admin configured the route does not exist.
- [ ] `unknown` is the state of a config that has never been probed or used, and the page does not imply health it has not measured.

Verification: `pnpm run build`, `pnpm run lint`, the server and web suites, and
the dry-run agent against a two-file fixture pool.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
