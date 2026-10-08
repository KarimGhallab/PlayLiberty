# 31: The web origin has no production deployment

**State:** `resolved`
**Category:** `bug`
**Blocked by:** 23. The front container injects the edge assertion the server now requires, so the server side of the split has to be settled first.

## Agent Brief

**Category:** bug
**Summary:** `deploy/` ships only the server. There is no production unit for the web origin, so the server sits alone on the shared edge network with no front container, which is the topology the deployment guideline forbids and the network half of security review finding 1.

**Current behavior:**
`deploy/` holds `playliberty-server.kube` and `playliberty-server.yaml` and nothing else. The server pod attaches alone to the external `pangolin_frontend` network and listens on `0.0.0.0:8080`. The web client has a `Containerfile` and an `nginx.conf.template` and runs in the dev `compose.yaml`, but there is no production Quadlet unit for it. `docs/ARCHITECTURE.md` lists the server's production Quadlet unit and, for the web, only the `Containerfile`, `nginx.conf`, and dev compose service.

The consequence is the split the deployment guideline requires is not in place: only the front container should be reachable on `pangolin_frontend`, and the backend should sit behind it. It also leaves nothing in production to inject `X-PlayLiberty-Edge`, so a server started with `EDGE_ASSERTION` set would refuse every request.

**Desired behavior:**
One production unit brings up a pod with the nginx front container and the server backend container sharing a network namespace. Only the pod is on `pangolin_frontend`; the server is not reachable on that network except through nginx. nginx serves the SPA and proxies `/api`, `/healthz`, and the live stream to the server at the pod-local address, injecting `X-PlayLiberty-Edge` from the `playliberty_edge_assertion` secret, the same value the server's `EDGE_ASSERTION` carries. No host port is published anywhere. The server binds the pod-local address and a port distinct from nginx's, resolving the collision between the two `8080` listeners.

**Key interfaces:**

- `deploy/playliberty-server.kube` and `playliberty-server.yaml`: the server moves into the front's pod; the `.kube` still attaches the pod to `pangolin_frontend.network`, but the server is no longer independently reachable.
- A new web unit (`deploy/playliberty-web.kube` and its YAML), or one combined pod manifest, holding the nginx front and the server backend.
- `apps/web/deploy/nginx.conf.template`: the upstream becomes the pod-local server address, which its own comment already anticipates ("a production pod maps `server` to `127.0.0.1` ... because its containers share one network namespace").
- The `playliberty_edge_assertion` secret, consumed by both containers' `EDGE_ASSERTION`.
- The server's `PORT` and bind address, and the nginx upstream port.

**Acceptance criteria:**

- [x] One production unit brings up the nginx front and the server backend in a single pod; only the pod joins `pangolin_frontend`, and the server cannot be reached on that network except through nginx.
- [x] No host port is published anywhere (no `ports:`, no `hostPort`, no `0.0.0.0` exposure outside the pod).
- [x] nginx serves the SPA and proxies `/api`, `/healthz`, and the live stream to the pod-local server, with no port collision between the two containers.
- [x] nginx injects `X-PlayLiberty-Edge` from the `playliberty_edge_assertion` secret, and an authenticated request through the edge succeeds against the server that requires the assertion.
- [x] A direct request to the server's port from outside the pod is unreachable or refused.
- [x] The unit loads and the pod starts locally (`systemctl --user` or `podman kube play`).
- [x] `docs/ARCHITECTURE.md` and the deployment guideline reflect the shape, and issue 23's out-of-scope follow-up is closed.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass (the app code is unchanged; the check is no regression).

**Out of scope:**

- Pangolin and Badger edge configuration, and the SSO bypass.
- The mobile client.
- Any change to the identity model; the assertion stays as issue 23 defined it.

## Outcome

Done. `deploy/` now carries the production origin as one unit.

- `deploy/playliberty-web.kube` and `playliberty-web.yaml` replace the server-only unit: one pod with the nginx front and the server backend in a shared network namespace. Only the pod joins `pangolin_frontend`, and no host port is published.
- nginx serves the SPA and proxies `/api`, `/healthz`, and the live stream to the pod-local server, injecting `X-PlayLiberty-Edge` from `playliberty_edge_assertion`. The upstream is the `WEB_UPSTREAM` value (`127.0.0.1:8081` in the pod, `server:8080` in dev).
- The server gained a `HOST` config value; the pod sets `127.0.0.1` and `PORT=8081`, so it is reachable only through nginx and the two listeners no longer collide.
- Read-only root filesystems throughout; the nginx writable paths (`/etc/nginx/conf.d`, `/var/cache/nginx`, `/tmp`) are emptyDirs. The dev compose service gained the `/etc/nginx/conf.d` tmpfs.
- Two defects surfaced on the way: the web `Containerfile` never installed or built `@playliberty/i18n`, so the web image could not build at all (fixed); and the server liveness probe used `wget`, which the server image does not ship, now `node -e fetch` (fixed).
- `docs/ARCHITECTURE.md` updated. The deployment guideline already required this shape, so it needed no change.

Verification: built the real server and web images and ran the pod with `podman kube play`. The SPA loads; a request through nginx with a forwarded `Remote-User` returns 200, so nginx injected the assertion; the live stream returns its ready frame; a direct request to the server without the assertion is 401; the server listens on `127.0.0.1:8081` only; no host port. Full unit suite 722 pass, `pnpm run build`, lint and prettier clean. The `.kube` unit itself was not run through systemd here because `pangolin_frontend.network` is absent on this host.

## Evidence

- `deploy/` contains only `playliberty-server.kube` and `playliberty-server.yaml`.
- `deploy/playliberty-server.kube:6` attaches the pod to `pangolin_frontend.network`; `deploy/playliberty-server.yaml:10-22` runs the server alone and binds container port 8080.
- `docs/ARCHITECTURE.md:98` lists the server's production Quadlet unit and, for the web, only the `Containerfile`, `nginx.conf`, and dev compose service.
- `~/.config/opencode/refs/guidelines/deployment.md:193-196` (keep backends private, attach only the front to `pangolin_frontend`, front upstream `127.0.0.1`).
- `apps/web/deploy/nginx.conf.template` (the comment on the production pod and `127.0.0.1`).
- Security review 2026-10-08, finding 1 (network half); issue 23 (the assertion) and its out-of-scope follow-up.
