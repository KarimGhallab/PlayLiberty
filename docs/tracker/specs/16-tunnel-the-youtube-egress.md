# Tunnel the YouTube egress

Status: ready
Labels: `enhancement`

## Problem Statement

The server has one egress: its own address. `packages/youtube` spawns yt-dlp with
no proxy, no cookies and no tunnel, so a flagged VPS address, a bot check, or a
missing proof turns every listing and every download into a failure. Playback
survives, because the stored media is the source of truth, but source access
stops, and
it stops loudly: the download worker claims pending tracks, marks each one failed
with a bounded excerpt of yt-dlp's stderr, and the sync run is written failed with
the vendor's message.

The container cannot fix this on its own. It runs `drop: ALL`, a read-only root
filesystem, `allowPrivilegeEscalation: false`, uid 1000, and a rootless Quadlet
pod, so it can neither create a WireGuard interface nor route one process through
it. The pod also shares one netns with nginx, so a route mistake inside it takes
the origin down with the tunnel.

A Proton VPN subscription supplies WireGuard configs. The goal is that only
yt-dlp leaves through one of them, that the VPS address and SSH are untouched,
that a dead exit rotates instead of poisoning the library, and that an operator
can see which exits exist and which still work.

## Solution

A system-scoped agent, `apps/egress-agent`, runs on the host inside a dedicated network
namespace whose only route is a Proton WireGuard interface. It owns the pool of
configs and which one is loaded, and it is the only thing that runs yt-dlp. The
pod reaches it over a Unix socket, and the server keeps the database, the media
root, the remux, the duration probe, the thumbnails and every policy decision.

The pod is not modified: it keeps its security context and its netns, because the
tunnel never enters it. A leak is impossible rather than unlikely, because the
namespace has nowhere else to send a packet.

The server treats an exit failure as a distinct condition. Failures are counted
per config, five consecutive exit-level failures rotate to the next config in
round robin, and a full pass of failed configs refuses the sync with a
`blocked` state instead of a failed run and a screen of failed rows. An
admin-only route in the web client lists the pool with its last attempt and its
status, can switch a standby, and can check the active exit by hand.

## Implementation Decisions

- **The tunnel lives in a host network namespace, not in the pod.** A
  system-scoped unit creates the namespace, brings up the interface from the
  active config, and starts the agent with `ip netns exec`. The pod keeps
  `drop: ALL`, its read-only root and its netns. _Decided here,_ because a
  rootless container cannot create the interface, and giving the application
  container `NET_ADMIN` would trade every container rule for one routing rule.
- **The agent is stateless and policy-free.** It owns the namespace, the pool,
  the loaded config, the child processes and the socket. It owns no database, no
  media file, no ffmpeg and no retry, rotation or check decision. _Decided here,_
  because the server already owns scheduling and history, and two owners of one
  decision is how a rotation loop starts.
- **The transport is HTTP over a Unix socket, not a port.** The socket is
  `/run/playliberty/egress-agent.sock`, created by the agent, and the pod mounts its
  directory. The agent requires `SO_PEERCRED` to report the configured peer uid,
  so a stray local process cannot drive the tunnel. No host port, no published
  listener, no network exposure. _Decided here,_ because the alternative is a
  loopback port reachable by anything on the host, which is a weaker check than
  the peer credential the kernel already hands the agent.
- **The agent returns bytes, and the server writes them.** `fetch` streams the
  raw download over the socket with the source extension in a header, and the
  server writes it into the existing media temp directory, then remuxes, probes
  and renames as it does today. _Decided here,_ because only the server may
  touch the media root; a shared temp path would break that rule and the `0700`
  storage contract from spec 15.
- **Only the listing and the download cross the tunnel.** `fetchThumbnail` stays
  in the server and leaves from the VPS address. _Decided here,_ because
  `ytimg.com` is a CDN and not the surface that gets flagged, so routing image
  bytes through a VPN buys nothing and adds a failure path.
- **Remux and duration probe stay on the server.** The agent needs no ffmpeg.
  `packages/youtube` splits into a fetcher seam (`listSource`, `fetch`) and a
  composition (`downloadTrack` = fetch, remux faststart, probe duration) that the
  download worker already calls, so the worker is unchanged. _Decided here,_
  because the stored-file contract is the server's, and the agent must not be
  able to produce a file the store did not shape.
- **`fetch` reports the path yt-dlp actually wrote.** The current adapter
  hardcodes `<videoId>.m4a` after a format selection that can fall back to Opus,
  so the fallback would fail. The resolved extension travels with the bytes and
  removes that assumption. _Decided here,_ because the stored container is still
  the server's remux and the source container is the tool's business.
- **The pool is a directory of configs ordered by name.** Files are
  `/etc/playliberty/proton/NN-<slug>.conf`, and the name shown in the interface
  is the file stem. The comment lines inside a Proton config are not parsed.
  _Decided here,_ because the filename is the only part of that file the operator
  controls and Proton's comments are not a contract.
- **Configs are downloaded once and switched at runtime.** Switching is
  `wg syncconf` inside the namespace, with no host route and no interface
  recreation. The endpoint in a config is an IP, so a config is perishable and
  its freshness is measured, never assumed. _Decided here,_ because Proton
  documents no schedule for fleet changes and their client manages the host
  network, which this design must not allow.
- **A failure is classified before it counts.** The adapter gains an exit-level
  class beside the existing gone-video and SponsorBlock classes: handshake
  failure, connection timeout, DNS failure inside the namespace, HTTP 403, HTTP
  429, and a bot-check message. A gone video, a 404, a SponsorBlock outage and a
  malformed URL are never exit-level. _Decided here,_ because a playlist of five
  removed videos would otherwise rotate the whole pool for nothing.
- **Five consecutive exit-level failures rotate to the next config.** The counter
  lives on the config row, resets on any success and whenever a config becomes
  active, and is bounded by a cooldown so a burst of parallel failures cannot
  cascade the pool. _Decided here,_ because a single failure is usually a bad
  video and five in a row is a bad exit.
- **One operation switches at most once.** A failed listing or download that
  reaches the limit switches, retries once on the new config, and stops. The
  pool is walked by consecutive operations, not inside one.
- **The open circuit is derived, not stored.** The circuit is open when every
  config is marked failed. A sync while it is open is refused with the `blocked`
  state; an explicit user-triggered sync is allowed and may rotate once.
  _Decided here,_ because a stored flag can disagree with the rows it summarises.
- **A switch drains, with a bound.** The agent waits for in-flight children for
  up to 60 seconds, then kills the process group. A killed track returns to
  `pending`, never to `failed`. _Decided here,_ because a handshake failure
  returns immediately but a blackholed tunnel waits out the socket timeout, and
  an unbounded drain would freeze the switch for the length of a download.
- **A blocked upstream is one sync state, not a row per track.** The worker
  releases its claims back to `pending` instead of calling `failTrack`, and the
  sync run fails with a fixed sentence rather than the vendor's output.
  `PlaylistSyncStatus` gains `blocked`, and the gallery reads it as the source
  being unreachable rather than as a playlist error.
- **The health store is one server table.** `egress_config` holds one row per
  config: name, endpoint, status, consecutive failures, last attempt, last
  error, last check, last observed exit address, and whether the agent reports
  it active. Latest state only, no history and no retention job. _Decided here,_
  because a history table needs a retention rule for a page nobody opens weekly.
- **The agent is authoritative for the pool and the loaded config.** The server
  reconciles its table from `status` at boot and before each rotation, and owns
  the history and the policy. _Decided here,_ because after a restart the stored
  row can disagree with the interface that is actually up.
- **The switch action checks on demand.** It applies the config if it is not
  loaded, reads the latest handshake, runs one listing extraction, and records
  the observed exit address. The check action reads the active config without
  switching. There is no timer. A successful real listing or download also
  refreshes the row, because it is the same evidence. _Decided here,_ because
  the user's trigger is traffic, and a schedule would be a second failure
  source with no consumer.
- **The interface is one admin route in the existing web client.** `/egress`
  lists every config with its name, endpoint, status (`ok`, `failed`, `unknown`),
  last attempt date, and one action per row: `Switch` on a standby (applies and
  checks) and `Check` on the active row (checks only). It is gated on
  `UserRole.Admin`, which the account read already carries, answers not-found to
  everyone else, and is absent from navigation for non-admins. The unverified
  apply stays available to rotation, with no page control. The switch action
  runs the check, so the check's verdict is what the row stores; there is no
  blind reset. _Decided here,_ because the egress is operator information and a
  household account has no action to take.
- **The server owns the pool settings.** `EGRESS_AGENT_SOCKET`, `EGRESS_AGENT_PEER_UID`,
  `EGRESS_FAILURE_LIMIT` (5), `EGRESS_DRAIN_TIMEOUT_MS` (60000) and
  `EGRESS_SWITCH_COOLDOWN_MS` (60000) are configuration, with those defaults, and
  the agent receives download options per request so there is one config owner.
- **The Proton config never enters the repository, the image or a Podman
  secret.** It is a root-owned `0600` file under `/etc/playliberty/proton/`. The
  build command gains a read-only check that the directory parses, and never
  writes it. _Decided here,_ because the tunnel is root-owned and the existing
  secrets belong to the rootless pod.
- **The namespace has its own resolver and no IPv6 route.**
  `/etc/netns/playliberty-egress/resolv.conf` points at the Proton resolver, the
  host resolver is untouched, and no global IPv6 address is configured, so a v6
  attempt cannot escape. yt-dlp is also forced to IPv4 so a v6 lookup failure is
  not counted as an exit failure.
- **The host already has the runtime.** Node 26 is a prerequisite of the
  deployment host from spec 15, and the host yt-dlp binary is copied out of the
  built server image, so the version and the committed digest are the image's and
  not a second pin.
- **The inherited constraints are owned by the architecture and not restated
  here:** identity from the forwarded edge headers, the client header and origin
  checks on mutations, the server as the only database and media writer, the
  dependency order of the server's folders, and the rule that only
  `packages/youtube` speaks YouTube.

## Tasks

1. **Split the adapter into a fetcher and a composition.** `packages/youtube`
   gains `listSource` and `fetch` on a fetcher seam, and the remux and duration
   probe move into a module the composition uses. The local fetcher keeps the
   current yt-dlp arguments, so the existing argument tests still describe it.
2. **Define the egress agent contract and both ends.** The calls (`status`,
   `list`, `fetch`, `switch`, `check`, `apply`) with their schemas, an
   HTTP-on-Unix-socket client that streams `fetch` into a temp file, and a server
   handler that checks the peer uid. Contract and streaming tests run over a real
   socket.
3. **Build `apps/egress-agent`.** Pool discovery and parsing, `wg syncconf`, the
   bounded drain, the endpoints, a `--dry-run` that parses and reports without
   touching the interface, and a fake `wg` plus a fake yt-dlp for the tests.
4. **Add the rotation policy and the blocked state to the server.** The exit
   classification wiring in the worker and the sync, the `egress_config` table
   and its migration, the counter, the cooldown, the one-switch bound, the
   derived circuit, the claim release, `PlaylistSyncStatus.blocked`, and the
   contracts and routes that expose the pool, including the switch route and
   the check route.
5. **Add the `/egress` route to the web client.** The admin gate, the table, the
   `Switch` and `Check` actions with their icons, in-flight and failure states,
   the `blocked` sync label and its copy in both catalogues.
6. **Write the deployment artifacts and the runbook.** The system unit, the
   script that creates the namespace and the interface, the socket directory,
   the per-namespace resolver, the pool directory and its permissions, the
   read-only check in the build command, and the updates to `ARCHITECTURE.md` and
   `AGENTS.md`. The external deployment guideline is updated outside the
   repository.
7. **Verify on the host.** The direct-versus-tunnel listing, the proof that only
   the agent's traffic uses the interface, a switch, a check of the active exit,
   and a full pass of failed configs producing `blocked`. No test asserts on
   Proton.

Tasks 1 and 2 order the cut. Task 3 follows task 2. Tasks 4 and 6 follow task 3.
Task 5 follows task 4.

## Out of Scope

- A scheduled or automatic switch or check, and automatic rotation beyond the
  five-failure rule.
- Reimplementing Proton's authentication or config API, and running Proton's
  own client on the host.
- Cookies, PO tokens, a proxy, or a second VPS or exit host.
- Check history, charts, metrics, alerting or a notification when an exit dies.
- Making the egress page visible to non-admins, or exposing it in the mobile
  client.
- Rotating on gone videos, 404s, SponsorBlock outages or malformed URLs.
- Any change to the audio pipeline, the stored container or the no-transcoding
  rule.
- Changes to the pod's security context, its netns or its deployment unit.
- The mobile client.
