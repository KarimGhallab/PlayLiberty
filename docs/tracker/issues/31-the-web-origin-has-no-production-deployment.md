# 31: The web origin has no production deployment

**State:** `resolved`
**Category:** `bug`
**Blocked by:** 23. The front container injects the edge assertion the server now requires, so the server side of the split has to be settled first.

## Outcome

Done. `deploy/` now carries the production origin as one unit.

- `deploy/playliberty-web.kube` and `playliberty-web.yaml` replace the server-only unit: one pod with the nginx front and the server backend in a shared network namespace. Only the pod joins `pangolin_frontend`, and no host port is published.
- nginx serves the SPA and proxies `/api`, `/healthz`, and the live stream to the pod-local server, injecting `X-PlayLiberty-Edge` from `playliberty_edge_assertion`. The upstream is the `WEB_UPSTREAM` value (`127.0.0.1:8081` in the pod, `server:8080` in dev).
- The server gained a `HOST` config value; the pod sets `127.0.0.1` and `PORT=8081`, so it is reachable only through nginx and the two listeners no longer collide.
- Read-only root filesystems throughout; the nginx writable paths (`/etc/nginx/conf.d`, `/var/cache/nginx`, `/tmp`) are emptyDirs. The dev compose service gained the `/etc/nginx/conf.d` tmpfs.
- Two defects surfaced on the way: the web `Containerfile` never installed or built `@playliberty/i18n`, so the web image could not build at all (fixed); and the server liveness probe used `wget`, which the server image does not ship, now `node -e fetch` (fixed).
- `docs/ARCHITECTURE.md` updated. The deployment guideline already required this shape, so it needed no change.

Verification: built the real server and web images and ran the pod with `podman kube play`. The SPA loads; a request through nginx with a forwarded `Remote-User` returns 200, so nginx injected the assertion; the live stream returns its ready frame; a direct request to the server without the assertion is 401; the server listens on `127.0.0.1:8081` only; no host port. Full unit suite 722 pass, `pnpm run build`, lint and prettier clean. The `.kube` unit itself was not run through systemd here because `pangolin_frontend.network` is absent on this host.
