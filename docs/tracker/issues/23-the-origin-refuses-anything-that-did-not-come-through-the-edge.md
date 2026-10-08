# 23: The origin refuses anything that did not come through the edge

**State:** `ready-for-agent`
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

- [ ] A request that forges `Remote-User` but carries no edge assertion is refused with 401.
- [ ] A request from the edge, assertion present, behaves exactly as before.
- [ ] The built server in production fails fast when the assertion secret is unset.
- [ ] nginx injects the assertion on `/api/`, `/healthz`, and the live stream location.
- [ ] Both the forged and the valid case have a test.
- [ ] ADR 0003 (or a new ADR) records the edge assertion.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Moving the server onto a private network and attaching only the front to `pangolin_frontend`. That is the deployment guideline's second layer and needs the web production pod, which does not exist yet; record it as the follow-up.
- Pangolin's own stripping of client `Remote-*` copies, which is unchanged.

## Evidence

- `apps/server/src/app/hooks/identity/identity.ts:62-85` accepts any non-empty `remote-user`.
- `apps/server/src/main.ts:64` binds `0.0.0.0`.
- `apps/web/deploy/nginx.conf:13-18` forwards headers unchanged.
- `deploy/playliberty-server.kube:6` attaches the server alone to `pangolin_frontend`.
- Security review 2026-10-08, finding 1.
