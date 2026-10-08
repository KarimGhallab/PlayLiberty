# 23: The origin refuses anything that did not come through the edge

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** The identity hook believes the `Remote-*` headers on any request that can reach the port, so anything with a foothold on the shared edge network, or any path that reaches the origin directly, can act as any account, admin included.

**Current behavior:**
`registerIdentityHook` accepts a request whose `remote-user` header is any non-empty string, with no proof it came from the edge. The server listens on `0.0.0.0`, nginx forwards client-supplied headers unchanged, and the production pod attaches the server alone to the external `pangolin_frontend` network. ADR 0003 states the trust precondition as "only reachable through Pangolin", but nothing in the origin enforces it, and the deployment guideline's private-network split is not in place.

**Desired behavior:**
The origin believes the edge and nothing else. nginx injects a secret assertion header (for example `X-PlayLiberty-Edge`) on every request it proxies, the server requires that assertion on every path except the readiness probes, and a request without it fails closed with 401 even when it supplies `Remote-User`. Production refuses to start when the assertion secret is not configured, so a missing secret is a boot failure rather than a silently open origin. The secret is read from the deployment's secret store, never committed.

**Key interfaces:**

- The identity hook: it is where the assertion is checked, beside the `Remote-User` check.
- Config: the assertion secret, required in production.
- The nginx origin: the deployment config and the web `Containerfile`, so the secret is injected without committing it. The unprivileged image runs `envsubst` over its templates, which is the natural seam.
- The deploy manifests under `deploy/` and `compose.yaml` supply the secret.
- ADR 0003 records the new mechanism; the deployment guide's network rule stays the second layer.

**Acceptance criteria:**

- [x] A request that forges `Remote-User` but carries no edge assertion is refused with 401.
- [x] A request from the edge, assertion present, behaves exactly as before.
- [x] The built server in production fails fast when the assertion secret is unset.
- [x] nginx injects the assertion on `/api/`, `/healthz`, and the live stream location.
- [x] Both the forged and the valid case have a test.
- [x] ADR 0003 (or a new ADR) records the edge assertion.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Moving the server onto a private network and attaching only the front to `pangolin_frontend`. That is the deployment guideline's second layer and needs the web production pod, which does not exist yet; record it as the follow-up.
- Pangolin's own stripping of client `Remote-*` copies, which is unchanged.

## Outcome

Done. The origin now requires the edge's assertion before it believes `Remote-User`.

- A new `EDGE_ASSERTION` config value. `loadConfig` throws in production when it is unset, so an open origin is a boot failure.
- The identity hook compares the `X-PlayLiberty-Edge` header against the secret in constant time and refuses a request without it (401), after the health-path exemption.
- The nginx config became a template the entrypoint renders at container start, injecting the assertion from the environment; the unprivileged image's `envsubst` is the seam. This also required a writable `/etc/nginx/conf.d`, addressed by issue 31's pod and the dev compose tmpfs.
- The secret is a podman secret in production (`playliberty_edge_assertion`, key `EDGE_ASSERTION`) and a plain value in the dev `compose.yaml`.
- ADR 0003 gained an update recording the assertion.
- Tests cover the forged request, a wrong assertion, the accepted request, and the health exemption.

Verification: server suite 281 pass; `pnpm run build` and `pnpm run lint` clean. The topology half (only the front reachable on the edge network) is issue 31.

## Evidence

- `apps/server/src/app/hooks/identity/identity.ts:62-85` accepts any non-empty `remote-user`.
- `apps/server/src/main.ts:64` binds `0.0.0.0`.
- `apps/web/deploy/nginx.conf:13-18` forwards headers unchanged.
- `deploy/playliberty-server.kube:6` attaches the server alone to `pangolin_frontend`.
- Security review 2026-10-08, finding 1.
