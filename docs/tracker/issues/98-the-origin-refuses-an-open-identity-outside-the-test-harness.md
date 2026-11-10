# 98: The origin refuses an open identity outside the test harness

**State:** `resolved`
**Category:** `bug`

## Outcome

The server classifies its runtime once as `test`, `development`, or `production`, and an unrecognised `NODE_ENV` is production, so a typo cannot relax a boot rule. Every non-test runtime requires `EDGE_ASSERTION` and fails in `loadConfig` before the listener starts, naming the setting. `HOST` defaults to `127.0.0.1`; any other address fails boot unless `ALLOW_NON_LOOPBACK_BIND=true`. The identity hook enforces the assertion outside the test harness, and still enforces one that the harness configures.

The documented development flow carries `EDGE_ASSERTION=dev-edge` in `apps/server/.env.example`, and the Vite dev proxy injects the same value under `X-PlayLiberty-Edge`, so `pnpm dev` keeps the one-origin shape nginx serves. The dev compose stack binds `0.0.0.0` with the explicit opt-in because the web container reaches the server over the Compose network; the production pod keeps its loopback bind. The architecture section records the rule.

The repository-wide build and the full server suite are currently red from unrelated, uncommitted source-failure work in the working tree, so the boot rules were also checked directly against the built `loadConfig`: development without an assertion, a non-loopback bind without the opt-in, and an unknown environment are refused, while the test harness starts without one.
