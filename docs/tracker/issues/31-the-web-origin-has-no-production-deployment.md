# 31: The web origin has no production deployment

**State:** `resolved`
**Category:** `bug`
**Blocked by:** 23. The front container injects the edge assertion the server now requires, so the server side of the split has to be settled first.

## Outcome

`deploy/` now carries the production origin as one unit. `deploy/playliberty-web.kube` and `playliberty-web.yaml` replace the server-only unit: one pod with the nginx front and the server backend in a shared network namespace, only the pod joining `pangolin_frontend`, and no host port published. nginx serves the SPA and proxies `/api`, `/healthz` and the live stream to the pod-local server, injecting `X-PlayLiberty-Edge` from `playliberty_edge_assertion`; the upstream is the `WEB_UPSTREAM` value (`127.0.0.1:8081` in the pod, `server:8080` in dev). The server gained a `HOST` config value and the pod sets `127.0.0.1` with `PORT=8081`, so it is reachable only through nginx; read-only root filesystems hold throughout, with the nginx writable paths (`/etc/nginx/conf.d`, `/var/cache/nginx`, `/tmp`) as emptyDirs. Two defects surfaced and were fixed on the way: the web `Containerfile` never installed or built `@playliberty/i18n`, and the server liveness probe used `wget`, now `node -e fetch`; `docs/ARCHITECTURE.md` was updated.
