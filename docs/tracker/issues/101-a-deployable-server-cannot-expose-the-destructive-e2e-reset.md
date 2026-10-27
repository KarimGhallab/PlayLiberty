# 101: A deployable server cannot expose the destructive e2e reset

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None. 98 is resolved, and its runtime classification is in place.

## Outcome

The E2E reset and drain are reachable only in the explicit test harness. `buildApp` registers them only when the runtime is `test` and `E2E_HARNESS=true`; a test runtime without the flag, or a production runtime with it, gets 404. The unit harness sets the flag once, and the e2e harness sets it in the server environment.

The production build now excludes `src/app/testing/**`, and the harness modules are resolved through a non-literal dynamic specifier so TypeScript does not pull them back in. `pnpm --filter @playliberty/server run build` emits no `dist/app/testing`; `build:e2e` compiles the harness into `dist-e2e` with the fake fixtures, and the root e2e scripts build that output before Playwright boots it. The reset and drain still answer 204 there.

Verification: `pnpm --filter @playliberty/server test` (435), `pnpm --filter @playliberty/e2e run typecheck`, `pnpm run build`, and `pnpm run lint:check` all pass. The production output has no `app/testing` directory and answers 404 on the reset with a valid edge assertion; the `dist-e2e` server answers 204 on both the reset and the drain. The new tests cover the missing harness flag, a production runtime with the flag set, and the build exclusion.
