# Egress agent runbook

The YouTube egress has two systemd scopes:

| Scope  | Unit                         | Owns                                                                                                              |
| ------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| System | `playliberty-egress.service` | The `playliberty-egress` namespace, the Proton interface, the agent, the socket and the active state.             |
| User   | `playliberty-web.service`    | The nginx and server pod on `pangolin_frontend`. It mounts the socket directory and nothing else from the egress. |

Only the agent and its yt-dlp children run inside the tunnel. The pod keeps
`drop: ALL`, its read-only root and its own network namespace; it never gets
`NET_ADMIN` and never joins the egress namespace. No host port is opened.

## Prerequisites

- Debian with `systemd`, `iproute2`, `wireguard-tools`, `nftables` and
  `procps`.
- The in-tree `wireguard` kernel module; `sudo modprobe wireguard` once if the
  host does not autoload it.
- Node 26 on the unit's `PATH`.
- Rootless Podman and the Pangolin edge from
  [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).
- The repository at `/opt/playliberty`. The unit's `WorkingDirectory` and
  `ExecStart` use that path; change them together if the checkout lives
  elsewhere.
- A Proton WireGuard subscription and its configs downloaded once.

## AppArmor

Ubuntu 25.04 and later ship AppArmor profiles for `wg-quick` and `wg`. They
allow `/etc/wireguard`, not `/etc/playliberty/proton`. The build command and
the agent use `wg-quick strip`, and the agent and the up script use
`wg syncconf` on a temporary file, so both profiles need local allowances.

Check the profiles and their local includes:

```sh
sudo aa-status | grep -E 'wg|wg-quick'
sudo grep -n 'local' /etc/apparmor.d/wg-quick /etc/apparmor.d/wg
```

Add the pool to `/etc/apparmor.d/local/wg-quick`:

```sh
sudo install -d -m 0755 /etc/apparmor.d/local
sudo tee /etc/apparmor.d/local/wg-quick >/dev/null <<'EOF'
# PlayLiberty egress pool: wg-quick strips these configs.
/etc/playliberty/ r,
/etc/playliberty/proton/ r,
/etc/playliberty/proton/** r,
EOF
```

Add the agent and up-script temporary files to `/etc/apparmor.d/local/wg`:

```sh
sudo tee /etc/apparmor.d/local/wg >/dev/null <<'EOF'
# PlayLiberty egress: wg syncconf reads a stripped config from a temp file.
/tmp/playliberty-wg-*/ r,
/tmp/playliberty-wg-*/config.conf r,
/tmp/tmp.* r,
EOF
```

Reload the profiles:

```sh
sudo apparmor_parser -r /etc/apparmor.d/wg-quick
sudo apparmor_parser -r /etc/apparmor.d/wg
```

If the profile does not include `<local/wg-quick>` or `<local/wg>`, add the
same rules inside the profile before its closing brace instead, or use
`sudo aa-complain /etc/apparmor.d/wg-quick` as a last resort. Do not disable
AppArmor globally.

Verify:

```sh
sudo wg-quick strip /etc/playliberty/proton/01-FR-634.conf >/dev/null
sudo dmesg | tail -20
```

A remaining `apparmor="DENIED"` line names the profile and path to add.

## Build the host

```sh
sudo install -d -m 0755 /opt/playliberty
sudo chown "$(id -u):$(id -gn)" /opt/playliberty
git clone <repository> /opt/playliberty
cd /opt/playliberty
pnpm install --frozen-lockfile
pnpm run build
pnpm deploy:build-for-production --public-origin https://playliberty.example.com
```

`pnpm deploy:build-for-production` builds the images, creates
`/srv/playliberty`, validates the pool read-only, extracts the server image's
yt-dlp to `/usr/local/lib/playliberty/yt-dlp` and verifies it against the
image's `org.playliberty.ytdlp.sha256` label, then ensures the Podman secrets.
It never installs, starts or stops a unit, and it never writes a config.

The agent's `dist` must exist before the pool check; `pnpm run build` provides
it.

## The pool

The pool is `/etc/playliberty/proton`. It is root-owned, the directory is
`0700` and every file is `0600`:

```sh
sudo install -d -m 0700 -o root -g root /etc/playliberty/proton
sudo install -m 0600 -o root -g root 01-FR-634.conf /etc/playliberty/proton/
sudo install -m 0600 -o root -g root 02-CH-264.conf /etc/playliberty/proton/
```

The file name is `NN-<slug>.conf`. The `NN-` prefix is the round-robin order;
the interface shows the file stem. The config is never committed, copied into
an image or stored in a Podman secret. The build command reads it, runs
`wg-quick strip` on it and runs the agent's `--dry-run`; none of those write it.
After adding or removing a config, restart the unit so the host's endpoint set
matches the pool.

## Install the unit

```sh
sudo install -m 0644 deploy/systemd/playliberty-egress.service /etc/systemd/system/
sudo install -m 0755 deploy/egress/egress-up.sh /usr/local/lib/playliberty/egress-up
sudo install -m 0755 deploy/egress/egress-down.sh /usr/local/lib/playliberty/egress-down
sudo install -m 0755 deploy/egress/egress-run.sh /usr/local/lib/playliberty/egress-run
sudo install -m 0600 deploy/egress/egress.env.example /etc/playliberty/egress.env
sudoedit /etc/playliberty/egress.env
sudo systemctl daemon-reload
sudo systemctl enable --now playliberty-egress.service
```

The environment file sets `EGRESS_AGENT_PEER_UID` to the deploying user's uid
(`id -u`), which is the uid the pod uses. It may also set
`PROTON_ACTIVE_CONFIG` for the first boot, and the check's URLs and timeouts.

If `node` is not on the unit's default `PATH`, add a drop-in that points at it:

```sh
sudo systemctl edit playliberty-egress.service
```

```ini
[Service]
Environment=PATH=/path/to/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

A Node installed under `/home` is not visible because the unit sets
`ProtectHome=yes`; install Node system-wide, or drop that line in the same
drop-in.

## Deployment layout

The deployment is split by lifecycle, not duplicated. One artifact has one
owner:

- code and build output under `/opt/playliberty`;
- host configuration and the pool under `/etc/playliberty`;
- host executables under `/usr/local/lib/playliberty`;
- runtime IPC and namespace files under `/run` and `/etc/netns`;
- persistent agent state under `/var/lib/playliberty-egress`;
- application data under `/srv/playliberty`;
- unit definitions under systemd and the user Quadlet directory.

The `deploy/` folder in the repository is the source of the unit and scripts.
The running host uses the installed copies in `/etc/systemd/system` and
`/usr/local/lib/playliberty`; they are not two running copies.

### Code and build output

| Path                                             | Owner / mode           | Purpose                                                                             | Lifecycle                         |
| ------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------- | --------------------------------- |
| `/opt/playliberty`                               | deploying user, `0755` | The repository checkout and monorepo. The unit's `WorkingDirectory` is under it.    | Persists; replace on upgrade.     |
| `/opt/playliberty/apps/egress-agent/dist`        | deploying user         | The compiled agent. `ExecStart` runs `main.js` here.                                | Rebuilt by `pnpm run build`.      |
| `/opt/playliberty/packages/youtube/dist`         | deploying user         | The shared YouTube adapter imported by the agent.                                   | Rebuilt by `pnpm run build`.      |
| `/opt/playliberty/node_modules`                  | deploying user         | Workspace links and runtime dependencies.                                           | `pnpm install --frozen-lockfile`. |
| `/opt/playliberty/docs/runbooks/egress-agent.md` | deploying user         | This runbook. The unit's `Documentation=` points here.                              | Persists.                         |
| `/opt/playliberty/deploy`                        | deploying user         | Source of the unit, scripts and environment example. Not read by the running agent. | Source only.                      |
| `/opt/playliberty/apps/egress-agent/proton`      | deploying user         | The development pool. Ignored by git and Docker. Not the production pool.           | Do not use in production.         |

### System configuration and host executables

| Path                                             | Owner / mode      | Purpose                                                                                                           | Lifecycle                                     |
| ------------------------------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `/etc/playliberty`                               | root:root, `0755` | Host configuration root.                                                                                          | Persists.                                     |
| `/etc/playliberty/proton`                        | root:root, `0700` | The Proton WireGuard pool, with files at `0600` named `NN-<slug>.conf`.                                           | Persists; add configs here, not under `/opt`. |
| `/etc/playliberty/egress.env`                    | root:root, `0600` | Agent overrides: peer uid, optional first-boot config, check URLs and timeouts.                                   | Persists.                                     |
| `/etc/systemd/system/playliberty-egress.service` | root:root, `0644` | The system unit that creates the namespace and runs the agent.                                                    | Persists.                                     |
| `/usr/local/lib/playliberty`                     | root:root, `0755` | Host-side egress executables.                                                                                     | Persists.                                     |
| `/usr/local/lib/playliberty/egress-up`           | root, `0755`      | Called by `egress-run` before the agent: namespace, veth, `wg0`, routes, resolver, nftables and socket directory. | Persists; run by systemd.                     |
| `/usr/local/lib/playliberty/egress-down`         | root, `0755`      | `ExecStop`: removes the namespace, veth, nftables table, resolver and socket.                                     | Persists; run by systemd on an explicit stop. |
| `/usr/local/lib/playliberty/egress-run`          | root, `0755`      | `ExecStart`: calls `egress-up`, then `exec`s the agent inside the namespace.                                      | Persists; run by systemd.                     |
| `/usr/local/lib/playliberty/yt-dlp`              | root, `0755`      | The host yt-dlp extracted from the server image and verified against its label.                                   | Re-extracted by the build command.            |

### Runtime and persistent state

| Path                                 | Owner / mode      | Purpose                                                                         | Lifecycle                                                         |
| ------------------------------------ | ----------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `/run/playliberty`                   | pod uid, `0700`   | Runtime socket directory. Mounted read-only into the server pod.                | systemd `RuntimeDirectory`, preserved on stop; recreated at boot. |
| `/run/playliberty/egress-agent.sock` | pod uid, `0600`   | HTTP over a Unix socket between the server and the agent. No host port.         | Agent; removed on stop or restart.                                |
| `/run/netns/playliberty-egress`      | root-managed      | Kernel handle for the egress network namespace.                                 | Created by `egress-up`; removed by `egress-down` or reboot.       |
| `/etc/netns/playliberty-egress`      | root, `0700`      | Per-namespace resolver, `resolv.conf` generated from the active config's `DNS`. | Created by `egress-up`; removed by `egress-down`.                 |
| `/var/lib/playliberty-egress`        | root:root, `0700` | Persistent agent state directory.                                               | systemd `StateDirectory`; persists.                               |
| `/var/lib/playliberty-egress/active` | root, `0600`      | The loaded config name. This is the reboot memory.                              | Written by the agent; persists.                                   |
| `/var/lib/playliberty-egress/cache`  | root              | The yt-dlp cache through `XDG_CACHE_HOME`.                                      | Created on demand; persists.                                      |
| Service-private `/tmp`               | service           | Temporary downloads and the stripped WireGuard config.                          | `PrivateTmp=yes`; ephemeral.                                      |

### Application data and the user-scope pod

| Path                                                     | Owner / mode           | Purpose                                                    | Lifecycle                                                 |
| -------------------------------------------------------- | ---------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| `/srv/playliberty`                                       | deploying user, `0700` | Media and database root. Mounted into the pod.             | Persists.                                                 |
| `/srv/playliberty/media`                                 | deploying user         | Audio, thumbnails and covers. The pod sees it as `/media`. | Persists.                                                 |
| `/srv/playliberty/data`                                  | deploying user         | The SQLite database. The pod sees it as `/data`.           | Persists.                                                 |
| `~/.config/containers/systemd`                           | deploying user         | User-scope Quadlet units for the web pod.                  | Persists.                                                 |
| `~/.config/containers/systemd/playliberty-web.kube`      | deploying user         | The pod unit.                                              | Persists.                                                 |
| `~/.config/containers/systemd/playliberty-web.yaml`      | deploying user         | The pod manifest.                                          | Persists.                                                 |
| `~/.config/containers/systemd/pangolin_frontend.network` | deploying user         | The external edge network.                                 | Persists.                                                 |
| `~/.local/share/containers`                              | deploying user         | Podman image and volume storage.                           | Managed by Podman; not a backup target for media or data. |

The pod mounts these host paths:

| Container path                          | Host source              | Mode       |
| --------------------------------------- | ------------------------ | ---------- |
| `/media`                                | `/srv/playliberty/media` | read-write |
| `/data`                                 | `/srv/playliberty/data`  | read-write |
| `/run/playliberty`                      | `/run/playliberty`       | read-only  |
| `/tmp`                                  | Podman `emptyDir`        | ephemeral  |
| `/etc/nginx/conf.d`, `/var/cache/nginx` | Podman `emptyDir`        | ephemeral  |

Back up `/etc/playliberty`, `/var/lib/playliberty-egress`,
`/srv/playliberty` and `~/.config/containers/systemd`. Do not back up `/run`,
`/tmp`, `/etc/netns` or `/opt`; recreate them from the unit and a fresh build.
To upgrade the code, update `/opt/playliberty`, run
`pnpm install --frozen-lockfile && pnpm run build`, then restart the unit. The
pool and the active state survive.

## What the unit creates

`ExecStart` runs `egress-run`, which calls `egress-up` and then `exec`s the
agent with `ip netns exec`. `egress-up` is idempotent:

- creates the `playliberty-egress` network namespace;
- creates the `pl-egress0`/`pl-egress1` veth pair and puts one end in the
  namespace;
- creates `wg0` once, applies the active config with `wg syncconf`, and never
  recreates a working interface on an agent restart;
- writes `/etc/netns/playliberty-egress/resolv.conf` from the config's `DNS`
  and leaves the host resolver alone;
- disables IPv6 in the namespace and adds the endpoint `/32` route over the
  veth plus the default route over `wg0`;
- installs the NAT and forward rules that let the namespace reach only the
  pool's endpoint IP:port pairs, without changing the host default route or
  sshd;
- owns `/run/playliberty` as the pod's uid.

`ExecStop` deletes the namespace only on an explicit stop, so
`Restart=on-failure` keeps a working interface.

The active config is `/var/lib/playliberty-egress/active`, written by the agent
after every successful apply or switch. The up script reads it first, then
`PROTON_ACTIVE_CONFIG`, then the first file in sort order. A reboot therefore
returns to the config the host had, not the first file in the pool.

A switch also replaces the new endpoint's `/32` route over the veth before
`wg syncconf`, and removes the previous endpoint's route after it, so a config
with a different endpoint can handshake without a namespace restart.

## Verify

```sh
systemctl status playliberty-egress.service
sudo journalctl -u playliberty-egress.service -n 50 --no-pager

sudo ip netns list
sudo ip -n playliberty-egress addr show wg0
sudo ip -n playliberty-egress route show
sudo ip netns exec playliberty-egress wg show wg0
sudo cat /var/lib/playliberty-egress/active

# The host route and sshd are unchanged, and no host port is open.
ip route show default
sudo ss -lntup | grep 51820 || true

# The pod's uid reaches the socket; another local user does not.
curl --unix-socket /run/playliberty/egress-agent.sock http://localhost/status
sudo -u nobody curl --unix-socket /run/playliberty/egress-agent.sock http://localhost/status
```

The status JSON is the same pool the `/egress` page lists. A switch or check
from the page moves the active marker and refreshes the state file.

The host yt-dlp is the image's:

```sh
podman inspect --format '{{ index .Config.Labels "org.playliberty.ytdlp.sha256" }}' \
  localhost/playliberty-server:latest
sha256sum /usr/local/lib/playliberty/yt-dlp
```

The two digests must match.

## Reboot

After a reboot, the namespace and interface are gone but the state file is not.
`playliberty-egress.service` starts after the network, the up script recreates
the namespace and applies the remembered config, and the agent reports the same
pool. The web pod's `hostPath` is `/run/playliberty` with `DirectoryOrCreate`,
so the pod can start before the agent; the up script fixes the directory owner
when it starts.

If the remembered config was removed from the pool, the unit fails with
`The active state file names "...", which is not in the pool.` Restore the file
or set `PROTON_ACTIVE_CONFIG` after removing the state file.

## Troubleshooting

| Symptom                                | Check                                                                                                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `egress-up` fails on the pool          | `stat -c '%u:%a' /etc/playliberty/proton /etc/playliberty/proton/*.conf`; the directory is `0:700` and files are `0:600`.                                                         |
| `wg syncconf` fails                    | `sudo wg-quick strip /etc/playliberty/proton/<name>.conf`; the build command already runs it.                                                                                     |
| No handshake                           | `sudo ip netns exec playliberty-egress wg show wg0`; check the endpoint route, the host NAT rules and the host firewall's forwarding policy.                                      |
| DNS fails in the namespace             | `sudo ip netns exec playliberty-egress cat /etc/resolv.conf`; it must be the config's `DNS`.                                                                                      |
| The pod cannot reach the socket        | `ls -ld /run/playliberty`; it is `0700` owned by `EGRESS_AGENT_PEER_UID`, and the socket is `0600` owned by the same uid.                                                         |
| The host yt-dlp differs from the image | Re-run `pnpm deploy:build-for-production`; it extracts and verifies the binary.                                                                                                   |
| A switch fails after the pool changed  | The state file or `PROTON_ACTIVE_CONFIG` names a file that is gone; restore it or choose another. A newly added config needs a unit restart so the host endpoint set includes it. |

## Invariants

- The pod never gets `NET_ADMIN`, never joins the egress namespace and never
  publishes a host port.
- The only route out of the namespace is `wg0`, plus the endpoint `/32` over
  the veth. IPv6 is disabled and yt-dlp is forced to IPv4.
- The pool is root-owned `0600`; it is never in git, the image or a Podman
  secret.
- The socket is `/run/playliberty/egress-agent.sock`, `0600`, in a directory
  owned by the pod's uid.
- The host yt-dlp is the server image's binary, verified against the image's
  committed digest.
- The active name is in `/var/lib/playliberty-egress/active`, so a reboot keeps
  the exit it had.
